import cron from 'node-cron';
import Session from '../models/session.model.js';
import anomalyService from '../services/anomaly.service.js';

// ============ SESSION AUTO-EXPIRY JOB ============

/**
 * Runs every hour to check for expired sessions
 * Sessions past their endDate are automatically expired
 */
export const sessionExpiryJob = cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Running session auto-expiry check...');

    try {
        const expiredSessions = await Session.findExpiredSessions();

        for (const session of expiredSessions) {
            await session.expire();
            console.log(`[Scheduler] Expired session: ${session.sessionId}`);
        }

        console.log(`[Scheduler] Expired ${expiredSessions.length} sessions`);
    } catch (error) {
        console.error('[Scheduler] Error in session expiry job:', error);
    }
}, {
    scheduled: false // Don't auto-start, manual start
});

// ============ ANOMALY DETECTION JOB ============

/**
 * Runs every 15 minutes to detect anomalies
 * Checks for inactivity, device offline, etc.
 */
export const anomalyDetectionJob = cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Running anomaly detection...');

    try {
        const results = await anomalyService.runAllDetections();

        console.log(`[Scheduler] Anomaly detection completed:`, {
            inactivity: results.inactivity.length,
            offline: results.offline.length
        });
    } catch (error) {
        console.error('[Scheduler] Error in anomaly detection job:', error);
    }
}, {
    scheduled: false
});

// ============ ALERT AUTO-ESCALATION JOB ============

/**
 * Runs every 30 minutes to escalate unacknowledged alerts
 */
export const alertEscalationJob = cron.schedule('*/30 * * * *', async () => {
    console.log('[Scheduler] Checking for alerts needing escalation...');

    try {
        const Alert = (await import('../models/alert.model.js')).default;
        const alertsToEscalate = await Alert.findNeedingEscalation();

        for (const alert of alertsToEscalate) {
            const currentSeverity = alert.severity;
            let newSeverity = currentSeverity;

            // Escalate severity
            if (currentSeverity === 'low') newSeverity = 'medium';
            else if (currentSeverity === 'medium') newSeverity = 'high';
            else if (currentSeverity === 'high') newSeverity = 'critical';

            if (newSeverity !== currentSeverity) {
                await alert.escalate(
                    newSeverity,
                    'Auto-escalated due to no acknowledgment',
                    null // System escalation
                );
                console.log(`[Scheduler] Escalated alert ${alert.alertId} to ${newSeverity}`);
            }
        }

        console.log(`[Scheduler] Escalated ${alertsToEscalate.length} alerts`);
    } catch (error) {
        console.error('[Scheduler] Error in alert escalation job:', error);
    }
}, {
    scheduled: false
});

// ============ START ALL JOBS ============

export const startAllJobs = () => {
    console.log('[Scheduler] Starting all background jobs...');
    sessionExpiryJob.start();
    anomalyDetectionJob.start();
    alertEscalationJob.start();
    console.log('[Scheduler] All jobs started');
};

// ============ STOP ALL JOBS ============

export const stopAllJobs = () => {
    console.log('[Scheduler] Stopping all background jobs...');
    sessionExpiryJob.stop();
    anomalyDetectionJob.stop();
    alertEscalationJob.stop();
    console.log('[Scheduler] All jobs stopped');
};

export default {
    sessionExpiryJob,
    anomalyDetectionJob,
    alertEscalationJob,
    startAllJobs,
    stopAllJobs
};
