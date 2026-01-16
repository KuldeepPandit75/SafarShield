import Session from '../models/session.model.js';
import User from '../models/user.models.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import crypto from 'crypto';

// ============ SESSION CREATION ============

// Create a new tourist session
// Only tourists can create sessions for themselves
export const createSession = asyncHandler(async (req, res) => {
    const {
        destination,
        description,
        startDate,
        endDate,
        geoFences,
        emergencyContacts,
        checkInInterval,
        inactivityThreshold
    } = req.body;

    const touristId = req.user._id;

    // Verify user role
    if (req.user.role !== 'tourist') {
        throw new ApiError(403, 'Only tourists can create sessions');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    if (start < now) {
        throw new ApiError(400, 'Start date cannot be in the past');
    }

    if (end <= start) {
        throw new ApiError(400, 'End date must be after start date');
    }

    // Check if user already has an active session
    const activeSession = await Session.findOne({
        touristId,
        status: { $in: ['pending', 'active'] }
    });

    if (activeSession) {
        throw new ApiError(400, 'You already have an active session. Please complete or terminate it first.');
    }

    // Generate blockchain hash for tamper detection
    const sessionData = {
        touristId: touristId.toString(),
        destination,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        timestamp: Date.now()
    };

    const sessionHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(sessionData))
        .digest('hex');

    // Create session
    const session = await Session.create({
        touristId,
        destination,
        description,
        startDate: start,
        endDate: end,
        sessionHash,
        geoFences: geoFences || [],
        emergencyContacts: emergencyContacts || [],
        checkInInterval: checkInInterval || 60,
        inactivityThreshold: inactivityThreshold || 120,
        status: 'pending',
        consent: {
            given: false // User must explicitly grant consent
        },
        deviceInfo: {
            deviceType: req.headers['user-agent'],
            appVersion: req.headers['app-version']
        }
    });

    return res.status(201).json(
        new ApiResponse(201, session, 'Session created successfully. Please grant consent to activate.')
    );
});

// ============ SESSION ACTIVATION ============

// Activate a session (start tracking)
export const activateSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { consentGiven } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Verify ownership
    if (session.touristId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only activate your own sessions');
    }

    // Check if session is pending
    if (session.status !== 'pending') {
        throw new ApiError(400, `Session is already ${session.status}`);
    }

    // Verify consent
    if (!consentGiven) {
        throw new ApiError(400, 'Consent is required to activate session');
    }

    // Grant consent
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    await session.grantConsent(ipAddress);

    // Activate session
    await session.activate();

    return res.status(200).json(
        new ApiResponse(200, session, 'Session activated. Location tracking enabled.')
    );
});

// ============ SESSION MANAGEMENT ============

// Get current active session
export const getActiveSession = asyncHandler(async (req, res) => {
    const touristId = req.user._id;

    const session = await Session.findOne({
        touristId,
        status: 'active'
    }).populate('touristId', 'fullname email emergencyContacts');

    if (!session) {
        return res.status(200).json(
            new ApiResponse(200, null, 'No active session found')
        );
    }

    return res.status(200).json(
        new ApiResponse(200, session, 'Active session retrieved')
    );
});

// Get all sessions for a tourist
export const getSessionHistory = asyncHandler(async (req, res) => {
    const touristId = req.user.role === 'tourist'
        ? req.user._id
        : req.params.touristId;

    // Admin/Police can view any tourist's history
    if (req.user.role === 'tourist' && touristId !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only view your own session history');
    }

    const sessions = await Session.find({ touristId })
        .sort({ createdAt: -1 })
        .select('-sessionHash') // Don't expose hash
        .populate('touristId', 'fullname email');

    return res.status(200).json(
        new ApiResponse(200, sessions, 'Session history retrieved')
    );
});

// Get session by ID
export const getSessionById = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId)
        .populate('touristId', 'fullname email phone emergencyContacts');

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Authorization check
    if (req.user.role === 'tourist' &&
        session.touristId._id.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'Access denied');
    }

    return res.status(200).json(
        new ApiResponse(200, session, 'Session retrieved')
    );
});

// ============ SESSION COMPLETION ============

// Complete session (normal end)
export const completeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Verify ownership
    if (session.touristId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only complete your own sessions');
    }

    if (session.status !== 'active') {
        throw new ApiError(400, 'Only active sessions can be completed');
    }

    await session.complete();

    return res.status(200).json(
        new ApiResponse(200, session, 'Session completed successfully. Tracking stopped.')
    );
});

// Terminate session early (cancel trip)
export const terminateSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { reason } = req.body;

    const session = await Session.findById(sessionId);

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    // Verify ownership
    if (session.touristId.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You can only terminate your own sessions');
    }

    if (!['pending', 'active'].includes(session.status)) {
        throw new ApiError(400, 'Session is already completed or terminated');
    }

    await session.terminate();

    if (reason) {
        session.adminNotes = `Terminated by user. Reason: ${reason}`;
        await session.save();
    }

    return res.status(200).json(
        new ApiResponse(200, session, 'Session terminated. Tracking stopped.')
    );
});

// ============ ADMIN ENDPOINTS ============

// Get all active sessions (Admin/Police only)
export const getAllActiveSessions = asyncHandler(async (req, res) => {
    if (!['admin', 'police'].includes(req.user.role)) {
        throw new ApiError(403, 'Access denied');
    }

    const sessions = await Session.find({
        status: 'active'
    })
        .populate('touristId', 'fullname email phone emergencyContacts')
        .sort({ activatedAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, sessions, `Found ${sessions.length} active sessions`)
    );
});

// Update session (Admin only)
export const updateSession = asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') {
        throw new ApiError(403, 'Admin access required');
    }

    const { sessionId } = req.params;
    const updates = req.body;

    // Don't allow updating critical fields
    delete updates.sessionId;
    delete updates.touristId;
    delete updates.sessionHash;
    delete updates.consent;

    const session = await Session.findByIdAndUpdate(
        sessionId,
        { $set: updates },
        { new: true, runValidators: true }
    );

    if (!session) {
        throw new ApiError(404, 'Session not found');
    }

    return res.status(200).json(
        new ApiResponse(200, session, 'Session updated')
    );
});

export default {
    createSession,
    activateSession,
    getActiveSession,
    getSessionHistory,
    getSessionById,
    completeSession,
    terminateSession,
    getAllActiveSessions,
    updateSession
};
