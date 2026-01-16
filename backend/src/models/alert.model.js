import mongoose from 'mongoose';

// Alert Model: Emergency alert lifecycle management
// Handles creation, escalation, assignment, and resolution
const alertSchema = new mongoose.Schema({

    alertId: {
        type: String,
        required: true,
        unique: true,
        default: () => `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },

    // Reference to session and tourist
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },

    touristId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Alert classification
    alertType: {
        type: String,
        enum: [
            'inactivity',           // No activity for extended period
            'geo_fence_breach',     // Left safe zone or entered restricted area
            'panic',                // Manual panic button pressed
            'device_offline',       // Device lost connection
            'low_battery',          // Battery critically low
            'rapid_movement',       // Unusually fast movement
            'suspicious_location',  // In known dangerous area
            'missed_checkin'        // Failed to check in on schedule
        ],
        required: true,
        index: true
    },

    // Severity level for prioritization
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true,
        default: 'medium',
        index: true
    },

    // Alert lifecycle status
    status: {
        type: String,
        enum: [
            'created',          // Just detected
            'acknowledged',     // Officer has seen it
            'investigating',    // Officer actively working on it
            'resolved',         // Issue resolved
            'false_alarm'       // Determined to be non-issue
        ],
        default: 'created',
        required: true,
        index: true
    },

    // Timestamps
    detectedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },

    acknowledgedAt: {
        type: Date
    },

    resolvedAt: {
        type: Date
    },

    // Police officer assignment
    assignedOfficer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Must have role='police'
        index: true
    },

    assignedAt: {
        type: Date
    },

    // Location at time of alert (if available)
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number] // [longitude, latitude]
        }
    },

    // Alert details and context
    description: {
        type: String,
        required: true
    },

    // Additional context from detection
    context: {
        lastKnownLocation: {
            coordinates: [Number],
            timestamp: Date
        },
        lastActivity: {
            type: String,
            timestamp: Date
        },
        battery: Number,
        networkStatus: String
    },

    // Escalation history
    escalationHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        fromSeverity: String,
        toSeverity: String,
        reason: String,
        escalatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],

    // Status change logs (audit trail)
    statusHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        fromStatus: String,
        toStatus: String,
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        notes: String
    }],

    // Resolution details
    resolution: {
        outcome: {
            type: String,
            enum: ['safe', 'assisted', 'false_alarm', 'escalated_to_authorities', 'other']
        },
        notes: {
            type: String,
            maxlength: 2000
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        actionsTaken: [{
            action: String,
            timestamp: Date,
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            }
        }]
    },

    // Auto-escalation settings
    autoEscalate: {
        enabled: {
            type: Boolean,
            default: true
        },
        escalateAfterMinutes: {
            type: Number,
            default: 30
        },
        hasEscalated: {
            type: Boolean,
            default: false
        }
    },

    // Related activity event (if triggered by panic button)
    activityEventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityEvent'
    },

    // Notifications sent
    notificationsSent: [{
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        channel: {
            type: String,
            enum: ['email', 'sms', 'push', 'socket']
        },
        sentAt: Date,
        delivered: Boolean
    }]

}, {
    timestamps: true
});

// ============ INDEXES ============
alertSchema.index({ status: 1, severity: 1, detectedAt: -1 });
alertSchema.index({ assignedOfficer: 1, status: 1 });
alertSchema.index({ touristId: 1, detectedAt: -1 });
alertSchema.index({ alertType: 1, status: 1 });
alertSchema.index({ location: '2dsphere' });

// ============ VIRTUAL FIELDS ============

// Check if alert is unresolved
alertSchema.virtual('isUnresolved').get(function () {
    return !['resolved', 'false_alarm'].includes(this.status);
});

// Check if alert is overdue (unacknowledged for too long)
alertSchema.virtual('isOverdue').get(function () {
    if (this.status !== 'created') return false;
    const minutesSinceDetection = (Date.now() - this.detectedAt) / (60 * 1000);
    return minutesSinceDetection > 15; // 15 minutes threshold
});

// Response time (time to acknowledge)
alertSchema.virtual('responseTimeMinutes').get(function () {
    if (!this.acknowledgedAt) return null;
    return (this.acknowledgedAt - this.detectedAt) / (60 * 1000);
});

// Resolution time (total time to resolve)
alertSchema.virtual('resolutionTimeMinutes').get(function () {
    if (!this.resolvedAt) return null;
    return (this.resolvedAt - this.detectedAt) / (60 * 1000);
});

// ============ METHODS ============

// Assign to police officer
alertSchema.methods.assign = async function (officerId) {
    this.assignedOfficer = officerId;
    this.assignedAt = new Date();

    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: 'acknowledged',
        changedBy: officerId,
        notes: 'Alert assigned to officer'
    });

    this.status = 'acknowledged';
    this.acknowledgedAt = new Date();

    return await this.save();
};

// Escalate severity
alertSchema.methods.escalate = async function (newSeverity, reason, escalatedBy) {
    this.escalationHistory.push({
        fromSeverity: this.severity,
        toSeverity: newSeverity,
        reason,
        escalatedBy
    });

    this.severity = newSeverity;
    this.autoEscalate.hasEscalated = true;

    return await this.save();
};

// Update status
alertSchema.methods.updateStatus = async function (newStatus, userId, notes = '') {
    this.statusHistory.push({
        fromStatus: this.status,
        toStatus: newStatus,
        changedBy: userId,
        notes
    });

    this.status = newStatus;

    if (newStatus === 'investigating') {
        // No additional action
    } else if (newStatus === 'resolved' || newStatus === 'false_alarm') {
        this.resolvedAt = new Date();
    }

    return await this.save();
};

// Resolve alert
alertSchema.methods.resolve = async function (outcome, notes, userId) {
    this.status = 'resolved';
    this.resolvedAt = new Date();

    this.resolution = {
        outcome,
        notes,
        resolvedBy: userId
    };

    this.statusHistory.push({
        fromStatus: 'resolved',
        toStatus: 'resolved',
        changedBy: userId,
        notes: `Alert resolved: ${outcome}`
    });

    return await this.save();
};

// ============ STATIC METHODS ============

// Get active alerts (unresolved)
alertSchema.statics.getActiveAlerts = function (officerId = null) {
    const query = {
        status: { $in: ['created', 'acknowledged', 'investigating'] }
    };

    if (officerId) {
        query.assignedOfficer = officerId;
    }

    return this.find(query)
        .sort({ severity: -1, detectedAt: 1 }) // Critical first, oldest first
        .populate('touristId sessionId assignedOfficer');
};

// Get unacknowledged alerts
alertSchema.statics.getUnacknowledgedAlerts = function () {
    return this.find({
        status: 'created'
    })
        .sort({ severity: -1, detectedAt: 1 })
        .populate('touristId sessionId');
};

// Get alerts by severity
alertSchema.statics.getBySeverity = function (severity) {
    return this.find({
        severity,
        status: { $in: ['created', 'acknowledged', 'investigating'] }
    })
        .sort({ detectedAt: 1 })
        .populate('touristId sessionId');
};

// Find alerts needing escalation
alertSchema.statics.findNeedingEscalation = function () {
    const threshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    return this.find({
        status: { $in: ['created', 'acknowledged'] },
        detectedAt: { $lt: threshold },
        'autoEscalate.enabled': true,
        'autoEscalate.hasEscalated': false
    });
};

// Get alert statistics
alertSchema.statics.getStatistics = async function (startDate, endDate) {
    const stats = await this.aggregate([
        {
            $match: {
                detectedAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    type: '$alertType',
                    severity: '$severity',
                    status: '$status'
                },
                count: { $sum: 1 },
                avgResponseTime: {
                    $avg: {
                        $subtract: ['$acknowledgedAt', '$detectedAt']
                    }
                }
            }
        }
    ]);

    return stats;
};

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
