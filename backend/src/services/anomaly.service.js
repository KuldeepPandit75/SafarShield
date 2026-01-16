import Session from '../models/session.model.js';
import LocationEvent from '../models/locationEvent.model.js';
import ActivityEvent from '../models/activityEvent.model.js';
import Alert from '../models/alert.model.js';
import GeoFence from '../models/geoFence.model.js';

// Anomaly Detection Service
// Rule-based detection (NO machine learning)
// Deterministic, clear thresholds for academic evaluation

// ============ INACTIVITY DETECTION ============

/**
 * Detect sessions with no recent location or activity events
 * @param {number} thresholdMinutes - Minutes of inactivity before alert
 * @returns {Promise<Array>} - Array of detected anomalies
 */
export const detectInactivity = async (thresholdMinutes = 120) => {
    try {
        // Find all active sessions
        const activeSessions = await Session.find({ status: 'active' });

        const anomalies = [];
        const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

        for (const session of activeSessions) {
            // Check if session has custom threshold
            const sessionThreshold = session.inactivityThreshold || thresholdMinutes;
            const sessionThresholdDate = new Date(Date.now() - sessionThreshold * 60 * 1000);

            // Check for recent activity events
            const recentActivity = await ActivityEvent.findOne({
                sessionId: session._id,
                timestamp: { $gt: sessionThresholdDate }
            });

            // Check for recent location events
            const recentLocation = await LocationEvent.findOne({
                sessionId: session._id,
                recordedAt: { $gt: sessionThresholdDate }
            });

            // If no recent activity or location, flag as inactive
            if (!recentActivity && !recentLocation) {
                // Check if alert already exists for this
                const existingAlert = await Alert.findOne({
                    sessionId: session._id,
                    alertType: 'inactivity',
                    status: { $in: ['created', 'acknowledged', 'investigating'] }
                });

                if (!existingAlert) {
                    // Get last known location
                    const lastLocation = await LocationEvent.findOne({
                        sessionId: session._id
                    }).sort({ recordedAt: -1 });

                    const lastActivity = await ActivityEvent.findOne({
                        sessionId: session._id
                    }).sort({ timestamp: -1 });

                    const minutesSinceActivity = lastActivity
                        ? (Date.now() - lastActivity.timestamp) / (60 * 1000)
                        : null;

                    const minutesSinceLocation = lastLocation
                        ? (Date.now() - lastLocation.recordedAt) / (60 * 1000)
                        : null;

                    // Create inactivity alert
                    const alert = await Alert.create({
                        sessionId: session._id,
                        touristId: session.touristId,
                        alertType: 'inactivity',
                        severity: minutesSinceActivity > 180 ? 'high' : 'medium', // 3+ hours = high
                        status: 'created',
                        description: `No activity detected for ${Math.floor(minutesSinceActivity || minutesSinceLocation)} minutes`,
                        location: lastLocation ? {
                            type: 'Point',
                            coordinates: lastLocation.location.coordinates
                        } : undefined,
                        context: {
                            lastKnownLocation: lastLocation ? {
                                coordinates: lastLocation.location.coordinates,
                                timestamp: lastLocation.recordedAt
                            } : null,
                            lastActivity: {
                                type: lastActivity?.eventType,
                                timestamp: lastActivity?.timestamp
                            },
                            battery: lastLocation?.battery?.level
                        }
                    });

                    anomalies.push({ session, alert, type: 'inactivity' });
                }
            }
        }

        return anomalies;
    } catch (error) {
        console.error('Error in detectInactivity:', error);
        throw error;
    }
};

// ============ GEO-FENCE BREACH DETECTION ============

/**
 * Check if a location violates geo-fence boundaries
 * @param {ObjectId} sessionId - Session to check
 * @param {number} longitude
 * @param {number} latitude
 * @returns {Promise<Object>} - Breach details or null
 */
export const detectGeoFenceBreach = async (sessionId, longitude, latitude) => {
    try {
        const session = await Session.findById(sessionId);

        if (!session || session.status !== 'active') {
            return null;
        }

        // If session has no geo-fences, no breach possible
        if (!session.geoFences || session.geoFences.length === 0) {
            return null;
        }

        // Check each geo-fence
        for (const fence of session.geoFences) {
            let isViolation = false;
            let violationType = '';

            if (fence.type === 'safe_zone') {
                // Check if point is OUTSIDE safe zone
                const isInside = await checkPointInPolygon(
                    longitude,
                    latitude,
                    fence.geometry.coordinates
                );

                if (!isInside) {
                    isViolation = true;
                    violationType = 'safe_zone_exit';
                }
            } else if (fence.type === 'restricted_area') {
                // Check if point is INSIDE restricted area
                const isInside = await checkPointInPolygon(
                    longitude,
                    latitude,
                    fence.geometry.coordinates
                );

                if (isInside) {
                    isViolation = true;
                    violationType = 'restricted_area_entry';
                }
            }

            if (isViolation) {
                // Check if alert already exists
                const existingAlert = await Alert.findOne({
                    sessionId,
                    alertType: 'geo_fence_breach',
                    status: { $in: ['created', 'acknowledged', 'investigating'] },
                    'context.fenceName': fence.name
                });

                if (!existingAlert) {
                    const alert = await Alert.create({
                        sessionId,
                        touristId: session.touristId,
                        alertType: 'geo_fence_breach',
                        severity: fence.type === 'restricted_area' ? 'high' : 'medium',
                        status: 'created',
                        description: `Geo-fence breach: ${violationType} - ${fence.name}`,
                        location: {
                            type: 'Point',
                            coordinates: [longitude, latitude]
                        },
                        context: {
                            fenceName: fence.name,
                            fenceType: fence.type,
                            violationType,
                            lastKnownLocation: {
                                coordinates: [longitude, latitude],
                                timestamp: new Date()
                            }
                        }
                    });

                    return { violation: true, alert, fence };
                }
            }
        }

        return null;
    } catch (error) {
        console.error('Error in detectGeoFenceBreach:', error);
        throw error;
    }
};

// ============ LOW BATTERY DETECTION ============

/**
 * Detect critically low battery levels
 * @param {ObjectId} sessionId
 * @param {number} batteryLevel - 0-100
 * @returns {Promise<Object>} - Alert if created
 */
export const detectLowBattery = async (sessionId, batteryLevel) => {
    if (batteryLevel > 20) {
        return null; // Not critical yet
    }

    try {
        const session = await Session.findById(sessionId);

        if (!session || session.status !== 'active') {
            return null;
        }

        // Check for existing low battery alert
        const existingAlert = await Alert.findOne({
            sessionId,
            alertType: 'low_battery',
            status: { $in: ['created', 'acknowledged'] }
        });

        if (existingAlert) {
            return null; // Already alerted
        }

        // Get last location
        const lastLocation = await LocationEvent.findOne({
            sessionId
        }).sort({ recordedAt: -1 });

        const severity = batteryLevel <= 10 ? 'high' : 'medium';

        const alert = await Alert.create({
            sessionId,
            touristId: session.touristId,
            alertType: 'low_battery',
            severity,
            status: 'created',
            description: `Device battery critically low: ${batteryLevel}%`,
            location: lastLocation ? {
                type: 'Point',
                coordinates: lastLocation.location.coordinates
            } : undefined,
            context: {
                battery: batteryLevel,
                lastKnownLocation: lastLocation ? {
                    coordinates: lastLocation.location.coordinates,
                    timestamp: lastLocation.recordedAt
                } : null
            }
        });

        return { alert };
    } catch (error) {
        console.error('Error in detectLowBattery:', error);
        throw error;
    }
};

// ============ DEVICE OFFLINE DETECTION ============

/**
 * Detect when device has been offline for extended period
 * @param {number} thresholdMinutes
 * @returns {Promise<Array>}
 */
export const detectDeviceOffline = async (thresholdMinutes = 60) => {
    try {
        const activeSessions = await Session.find({ status: 'active' });
        const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);
        const anomalies = [];

        for (const session of activeSessions) {
            const lastLocation = await LocationEvent.findOne({
                sessionId: session._id
            }).sort({ uploadedAt: -1 });

            if (lastLocation && lastLocation.uploadedAt < threshold) {
                // Device hasn't uploaded data in a while
                const existingAlert = await Alert.findOne({
                    sessionId: session._id,
                    alertType: 'device_offline',
                    status: { $in: ['created', 'acknowledged'] }
                });

                if (!existingAlert) {
                    const minutesOffline = (Date.now() - lastLocation.uploadedAt) / (60 * 1000);

                    const alert = await Alert.create({
                        sessionId: session._id,
                        touristId: session.touristId,
                        alertType: 'device_offline',
                        severity: minutesOffline > 120 ? 'high' : 'medium',
                        status: 'created',
                        description: `Device offline for ${Math.floor(minutesOffline)} minutes`,
                        location: {
                            type: 'Point',
                            coordinates: lastLocation.location.coordinates
                        },
                        context: {
                            lastKnownLocation: {
                                coordinates: lastLocation.location.coordinates,
                                timestamp: lastLocation.uploadedAt
                            },
                            battery: lastLocation.battery?.level
                        }
                    });

                    anomalies.push({ session, alert, type: 'device_offline' });
                }
            }
        }

        return anomalies;
    } catch (error) {
        console.error('Error in detectDeviceOffline:', error);
        throw error;
    }
};

// ============ HELPER FUNCTIONS ============

/**
 * Check if a point is inside a polygon (simplified)
 * In production, use a proper geospatial library like turf.js
 */
function checkPointInPolygon(longitude, latitude, polygonCoords) {
    // This is a placeholder
    // Real implementation would use ray-casting algorithm or MongoDB $geoWithin
    // For now, return false to avoid false positives
    return false;
}

// ============ MASTER DETECTION FUNCTION ============

/**
 * Run all anomaly detection checks
 * Called periodically by cron job
 */
export const runAllDetections = async () => {
    console.log('[Anomaly Detection] Running all detection checks...');

    try {
        const inactivityResults = await detectInactivity();
        console.log(`[Anomaly Detection] Found ${inactivityResults.length} inactivity anomalies`);

        const offlineResults = await detectDeviceOffline();
        console.log(`[Anomaly Detection] Found ${offlineResults.length} offline devices`);

        return {
            inactivity: inactivityResults,
            offline: offlineResults,
            timestamp: new Date()
        };
    } catch (error) {
        console.error('[Anomaly Detection] Error running detections:', error);
        throw error;
    }
};

export default {
    detectInactivity,
    detectGeoFenceBreach,
    detectLowBattery,
    detectDeviceOffline,
    runAllDetections
};
