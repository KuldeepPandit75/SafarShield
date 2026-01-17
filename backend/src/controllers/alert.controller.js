import Alert from '../models/alert.model.js';
import Session from '../models/session.model.js';
import ActivityEvent from '../models/activityEvent.model.js';
import LocationEvent from '../models/locationEvent.model.js';
import {User} from '../models/user.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// ============ ALERT CREATION ============

// Create manual panic alert
export const createPanicAlert = asyncHandler(async (req, res) => {
    const { sessionId, message, location } = req.body;
    const touristId = req.user._id;

    // Verify session exists and belongs to user
    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    if (session.touristId.toString() !== touristId.toString()) {
        throw new ApiError(403, 'Session does not belong to you');
    }

    if (session.status !== 'active') {
        throw new ApiError(400, 'Session is not active');
    }

    // Create activity event for panic button
    const activityEvent = await ActivityEvent.create({
        sessionId,
        touristId,
        eventType: 'panic_button',
        timestamp: new Date(),
        emergency: {
            isPanic: true,
            severity: 'critical',
            message: message || 'Emergency - Help needed!'
        },
        location: location ? {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        } : undefined,
        deviceState: {
            battery: req.body.battery,
            networkType: req.body.networkType,
            isOnline: true
        }
    });

    // Create alert
    const alert = await Alert.create({
        sessionId,
        touristId,
        alertType: 'panic',
        severity: 'critical',
        status: 'created',
        description: message || 'Tourist triggered panic button',
        location: location ? {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
        } : undefined,
        context: {
            lastKnownLocation: location ? {
                coordinates: [location.longitude, location.latitude],
                timestamp: new Date()
            } : undefined,
            battery: req.body.battery,
            networkStatus: req.body.networkType
        },
        activityEventId: activityEvent._id
    });

    // Update session alert count
    session.alertCount += 1;
    await session.save();

    // TODO: Send real-time notification to police via Socket.io

    return res.status(201).json(
        new ApiResponse(201, alert, 'Emergency alert created. Help is on the way.')
    );
});

// ============ ALERT RETRIEVAL ============

// Get alerts (filtered by role)
export const getAlerts = asyncHandler(async (req, res) => {
    const { status, severity, alertType, sessionId } = req.query;

    let query = {};

    // Role-based filtering
    if (req.user.role === 'tourist') {
        // Tourists only see their own alerts
        query.touristId = req.user._id;
    } else if (req.user.role === 'police') {
        // Police see all unresolved alerts or their assigned alerts
        if (req.query.assigned === 'me') {
            query.assignedOfficer = req.user._id;
        } else {
            query.status = { $in: ['created', 'acknowledged', 'investigating'] };
        }
    }
    // Admin sees all alerts (no additional filter)

    // Apply filters
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (alertType) query.alertType = alertType;
    if (sessionId) query.sessionId = sessionId;

    const alerts = await Alert.find(query)
        .sort({ severity: -1, detectedAt: -1 })
        .populate('touristId', 'fullname email phone emergencyContacts')
        .populate('sessionId', 'destination startDate endDate')
        .populate('assignedOfficer', 'fullname badgeNumber department')
        .limit(100);

    return res.status(200).json(
        new ApiResponse(200, alerts, `Found ${alerts.length} alerts`)
    );
});

// Get single alert by ID
export const getAlertById = asyncHandler(async (req, res) => {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId)
        .populate('touristId', 'fullname  email phone emergencyContacts')
        .populate('sessionId')
        .populate('assignedOfficer', 'fullname badgeNumber department')
        .populate('activityEventId');

    if (!alert) {
        throw new ApiError(404, 'Alert not found');
    }

    // Authorization check
    if (req.user.role === 'tourist' &&
        alert.touristId._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
    }

    return res.status(200).json(
        new ApiResponse(200, alert, 'Alert retrieved')
    );
});

// ============ ALERT MANAGEMENT (Police/Admin) ============

// Acknowledge alert (police takes ownership)
export const acknowledgeAlert = asyncHandler(async (req, res) => {
    if (!['police', 'admin'].includes(req.user.role)) {
        throw new ApiError(403, 'Only police officers can acknowledge alerts');
    }

    const { alertId } = req.params;

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, 'Alert not found');
    }

    if (alert.status !== 'created') {
        throw new ApiError(400, 'Alert is already acknowledged');
    }

    await alert.assign(req.user._id);

    return res.status(200).json(
        new ApiResponse(200, alert, 'Alert acknowledged and assigned to you')
    );
});

// Update alert status
export const updateAlertStatus = asyncHandler(async (req, res) => {
    if (!['police', 'admin'].includes(req.user.role)) {
        throw new ApiError(403, 'Only police officers can update alert status');
    }

    const { alertId } = req.params;
    const { status, notes } = req.body;

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, 'Alert not found');
    }

    const validTransitions = {
        created: ['acknowledged', 'investigating'],
        acknowledged: ['investigating', 'resolved', 'false_alarm'],
        investigating: ['resolved', 'false_alarm']
    };

    if (!validTransitions[alert.status]?.includes(status)) {
        throw new ApiError(400, `Cannot transition from ${alert.status} to ${status}`);
    }

    await alert.updateStatus(status, req.user._id, notes);

    return res.status(200).json(
        new ApiResponse(200, alert, `Alert status updated to ${status}`)
    );
});

// Resolve alert
export const resolveAlert = asyncHandler(async (req, res) => {
    if (!['police', 'admin'].includes(req.user.role)) {
        throw new ApiError(403, 'Only police officers can resolve alerts');
    }

    const { alertId } = req.params;
    const { outcome, notes } = req.body;

    if (!outcome) {
        throw new ApiError(400, 'Outcome is required');
    }

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, 'Alert not found');
    }

    if (['resolved', 'false_alarm'].includes(alert.status)) {
        throw new ApiError(400, 'Alert is already resolved');
    }

    await alert.resolve(outcome, notes, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, alert, 'Alert resolved successfully')
    );
});

// Escalate alert severity
export const escalateAlert = asyncHandler(async (req, res) => {
    if (!['police', 'admin'].includes(req.user.role)) {
        throw new ApiError(403, 'Only police officers can escalate alerts');
    }

    const { alertId } = req.params;
    const { severity, reason } = req.body;

    const alert = await Alert.findById(alertId);

    if (!alert) {
        throw new ApiError(404, 'Alert not found');
    }

    const severityLevels = ['low', 'medium', 'high', 'critical'];
    const currentLevel = severityLevels.indexOf(alert.severity);
    const newLevel = severityLevels.indexOf(severity);

    if (newLevel <= currentLevel) {
        throw new ApiError(400, 'Can only escalate to higher severity');
    }

    await alert.escalate(severity, reason, req.user._id);

    return res.status(200).json(
        new ApiResponse(200, alert, `Alert escalated to ${severity}`)
    );
});

// ============ DASHBOARD STATISTICS ============

// Get alert statistics (Admin/Police)
export const getAlertStatistics = asyncHandler(async (req, res) => {
    if (!['police', 'admin'].includes(req.user.role)) {
        throw new ApiError(403, 'Access denied');
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await Alert.getStatistics(start, end);

    // Additional aggregations
    const totalAlerts = await Alert.countDocuments({
        detectedAt: { $gte: start, $lte: end }
    });

    const unresolvedAlerts = await Alert.countDocuments({
        status: { $in: ['created', 'acknowledged', 'investigating'] }
    });

    const criticalAlerts = await Alert.countDocuments({
        severity: 'critical',
        status: { $in: ['created', 'acknowledged', 'investigating'] }
    });

    return res.status(200).json(
        new ApiResponse(200, {
            totalAlerts,
            unresolvedAlerts,
            criticalAlerts,
            breakdown: stats
        }, 'Alert statistics retrieved')
    );
});

export default {
    createPanicAlert,
    getAlerts,
    getAlertById,
    acknowledgeAlert,
    updateAlertStatus,
    resolveAlert,
    escalateAlert,
    getAlertStatistics
};
