import LocationEvent from '../models/locationEvent.model.js';
import Session from '../models/session.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import anomalyService from '../services/anomaly.service.js';
import { client } from '../integrations/cache/redis.js';

// ============ LOCATION INGESTION ============

/**
 * Batch location upload (offline-tolerant)
 * Accepts array of location events, handles out-of-order timestamps
 */
export const ingestLocationBatch = asyncHandler(async (req, res) => {
    const { sessionId, locations } = req.body;
    const touristId = req.user._id;

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
        throw new ApiError(400, 'Locations array is required');
    }

    // Verify session exists and is active
    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    if (session.touristId.toString() !== touristId.toString()) {
        throw new ApiError(403, 'Session does not belong to you');
    }

    if (session.status !== 'active') {
        throw new ApiError(400, 'Session is not active. Cannot upload locations.');
    }

    if (!session.consent.given) {
        throw new ApiError(403, 'Consent not given for location tracking');
    }

    // Process batch
    const batchId = `BATCH-${Date.now()}`;
    const results = {
        success: [],
        failed: [],
        anomalies: []
    };

    // Sort by recordedAt to handle out-of-order events
    const sortedLocations = locations.sort((a, b) =>
        new Date(a.recordedAt) - new Date(b.recordedAt)
    );

    for (const loc of sortedLocations) {
        try {
            // Validate coordinates
            if (!loc.latitude || !loc.longitude) {
                results.failed.push({ location: loc, reason: 'Missing coordinates' });
                continue;
            }

            if (loc.latitude < -90 || loc.latitude > 90 ||
                loc.longitude < -180 || loc.longitude > 180) {
                results.failed.push({ location: loc, reason: 'Invalid coordinates' });
                continue;
            }

            // Create location event
            const locationEvent = await LocationEvent.create({
                sessionId,
                touristId,
                location: {
                    type: 'Point',
                    coordinates: [loc.longitude, loc.latitude]
                },
                accuracy: loc.accuracy,
                altitude: loc.altitude,
                speed: loc.speed,
                heading: loc.heading,
                recordedAt: new Date(loc.recordedAt),
                uploadedAt: new Date(),
                battery: {
                    level: loc.battery,
                    isCharging: loc.isCharging || false
                },
                isOfflineSync: locations.length > 1, // Batch uploads are offline syncs
                batchId,
                networkInfo: {
                    type: loc.networkType,
                    strength: loc.networkStrength
                },
                deviceInfo: {
                    platform: loc.platform,
                    osVersion: loc.osVersion
                }
            });

            // Update Redis with latest location (real-time tracking)
            await client.hset(
                touristId.toString(),
                {
                    userId: touristId.toString(),
                    sessionId: sessionId.toString(),
                    lat: loc.latitude.toString(),
                    lng: loc.longitude.toString(),
                    speed: (loc.speed || 0).toString(),
                    heading: (loc.heading || 0).toString(),
                    battery: (loc.battery || 0).toString(),
                    updated_at: new Date().toISOString()
                }
            );

            // Run anomaly detection
            // Check geo-fence breach
            const breach = await anomalyService.detectGeoFenceBreach(
                sessionId,
                loc.longitude,
                loc.latitude
            );

            if (breach) {
                results.anomalies.push({
                    type: 'geo_fence_breach',
                    alert: breach.alert
                });
            }

            // Check low battery
            if (loc.battery && loc.battery <= 20) {
                const batteryAlert = await anomalyService.detectLowBattery(
                    sessionId,
                    loc.battery
                );
                if (batteryAlert) {
                    results.anomalies.push({
                        type: 'low_battery',
                        alert: batteryAlert.alert
                    });
                }
            }

            results.success.push(locationEvent._id);

        } catch (error) {
            results.failed.push({ location: loc, reason: error.message });
        }
    }

    // Update session last location timestamp
    await session.recordLocation();

    return res.status(201).json(
        new ApiResponse(201, results, `Processed ${results.success.length}/${locations.length} locations`)
    );
});

// ============ LOCATION RETRIEVAL ============

// Get location history for a session
export const getLocationHistory = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { limit = 100, startDate, endDate } = req.query;

    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Authorization: tourist can view own, police/admin can view all
    if (req.user.role === 'tourist' &&
        session.touristId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
    }

    let query = { sessionId };

    if (startDate || endDate) {
        query.recordedAt = {};
        if (startDate) query.recordedAt.$gte = new Date(startDate);
        if (endDate) query.recordedAt.$lte = new Date(endDate);
    }

    const locations = await LocationEvent.find(query)
        .sort({ recordedAt: -1 })
        .limit(parseInt(limit))
        .select('location recordedAt uploadedAt battery accuracy flags');

    return res.status(200).json(
        new ApiResponse(200, locations, `Found ${locations.length} location events`)
    );
});

// Get current location from Redis
export const getCurrentLocation = asyncHandler(async (req, res) => {
    const { touristId } = req.params;

    // Authorization check
    if (req.user.role === 'tourist' && touristId !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
    }

    const exists = await client.exists(touristId);

    if (!exists) {
        return res.status(200).json(
            new ApiResponse(200, null, 'No current location available')
        );
    }

    const data = await client.hgetall(touristId);

    return res.status(200).json(
        new ApiResponse(200, data, 'Current location retrieved')
    );
});

// Get last known location (from database)
export const getLastKnownLocation = asyncHandler(async (req, res) => {
    const { touristId } = req.params;

    // Authorization check
    if (req.user.role === 'tourist' && touristId !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
    }

    const lastLocation = await LocationEvent.findOne({ touristId })
        .sort({ recordedAt: -1 })
        .select('location recordedAt battery sessionId')
        .populate('sessionId', 'destination status');

    if (!lastLocation) {
        return res.status(200).json(
            new ApiResponse(200, null, 'No location history found')
        );
    }

    return res.status(200).json(
        new ApiResponse(200, lastLocation, 'Last known location retrieved')
    );
});

export default {
    ingestLocationBatch,
    getLocationHistory,
    getCurrentLocation,
    getLastKnownLocation
};
