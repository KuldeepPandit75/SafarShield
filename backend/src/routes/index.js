import express from 'express';
import {verifyJWT as authMiddleware} from '../middlewares/auth.middleware.js';
import * as sessionController from '../controllers/session.controller.js';
import * as alertController from '../controllers/alert.controller.js';
import * as locationController from '../controllers/location.controller.js';
import * as authController from '../controllers/auth.controller.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// ============ HEALTH CHECK ============
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// ============ AUTHENTICATION ROUTES ============
router.post('/auth/send-otp', authController.sendOTP);
router.post('/auth/verify-otp', authController.verifyOTP);
router.post('/auth/reset-password', authController.resetPassword);

// ============ USER ROUTES ============
router.post('/users/register', userController.registerUser);
router.post('/users/login', userController.loginUser);
router.post('/users/google-login', userController.googleLogin);
router.get('/users/check-username/:username', userController.checkUsernameAvailability);

// Protected user routes
router.get('/users/me', authMiddleware, userController.getMe);
router.post('/users/logout', authMiddleware, userController.logoutUser);
router.patch('/users/me', authMiddleware, userController.updateUser);
router.post('/users/profile-picture', authMiddleware, userController.updateProfilePicture);

// User location update (existing functionality - preserved)
router.post('/users/:userId/location', authMiddleware, userController.updateUserLocation);
router.get('/users/:userId/location', authMiddleware, userController.getUserLocation);

// ============ SESSION ROUTES (Tourist Safety System) ============
router.post('/sessions', authMiddleware, sessionController.createSession);
router.post('/sessions/:sessionId/activate', authMiddleware, sessionController.activateSession);
router.get('/sessions/active', authMiddleware, sessionController.getActiveSession);
router.get('/sessions/history', authMiddleware, sessionController.getSessionHistory);
router.get('/sessions/:sessionId', authMiddleware, sessionController.getSessionById);
router.post('/sessions/:sessionId/complete', authMiddleware, sessionController.completeSession);
router.post('/sessions/:sessionId/terminate', authMiddleware, sessionController.terminateSession);

// Admin/Police session routes
router.get('/sessions/all/active', authMiddleware, sessionController.getAllActiveSessions);
router.patch('/sessions/:sessionId', authMiddleware, sessionController.updateSession);

// ============ LOCATION ROUTES ============
router.post('/locations/batch', authMiddleware, locationController.ingestLocationBatch);
router.get('/locations/session/:sessionId', authMiddleware, locationController.getLocationHistory);
router.get('/locations/current/:touristId', authMiddleware, locationController.getCurrentLocation);
router.get('/locations/last/:touristId', authMiddleware, locationController.getLastKnownLocation);

// ============ ALERT ROUTES ============
router.post('/alerts/panic', authMiddleware, alertController.createPanicAlert);
router.get('/alerts', authMiddleware, alertController.getAlerts);
router.get('/alerts/:alertId', authMiddleware, alertController.getAlertById);
router.post('/alerts/:alertId/acknowledge', authMiddleware, alertController.acknowledgeAlert);
router.patch('/alerts/:alertId/status', authMiddleware, alertController.updateAlertStatus);
router.post('/alerts/:alertId/resolve', authMiddleware, alertController.resolveAlert);
router.post('/alerts/:alertId/escalate', authMiddleware, alertController.escalateAlert);
router.get('/alerts/statistics/dashboard', authMiddleware, alertController.getAlertStatistics);

// ============ NOTIFICATIONS ============
router.get('/notifications', authMiddleware, userController.getNotifications);
router.patch('/notifications/:notificationId/read', authMiddleware, userController.markNotificationAsRead);
router.patch('/notifications/read-all', authMiddleware, userController.markAllNotificationsAsRead);
router.get('/notifications/unread/count', authMiddleware, userController.getUnreadNotificationCount);

export default router;
