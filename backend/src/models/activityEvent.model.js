import mongoose from 'mongoose';

// ActivityEvent Model: Records user activities for inactivity detection
// Used for anomaly detection: panic button, check-ins, device interactions
const activityEventSchema = new mongoose.Schema({

    // Reference to the session
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true,
        index: true
    },

    // Reference to the tourist
    touristId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Type of activity event
    // check_in: Manual user check-in (I'm safe)
    // panic_button: Emergency SOS triggered
    // sos: Alternative emergency signal
    // device_shake: Phone shake detection for emergency
    // app_opened: User opened the app
    // location_shared: User manually shared location
    eventType: {
        type: String,
        enum: [
            'check_in',
            'panic_button',
            'sos',
            'device_shake',
            'app_opened',
            'location_shared',
            'boundary_acknowledged',
            'low_battery_warning'
        ],
        required: true,
        index: true
    },

    // When the activity occurred
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },

    // Event-specific metadata (flexible JSON)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Location at time of event (optional, not all activities have location)
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

    // For panic/SOS events
    emergency: {
        isPanic: {
            type: Boolean,
            default: false
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        message: {
            type: String,
            maxlength: 500
        },
        // Auto-created alert reference
        alertId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Alert'
        }
    },

    // Device state at time of event
    deviceState: {
        battery: Number,
        networkType: String,
        isOnline: Boolean
    },

    // Acknowledgment (for check-ins)
    isAcknowledged: {
        type: Boolean,
        default: false
    },

    acknowledgedAt: {
        type: Date
    },

    acknowledgedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Police officer who acknowledged
    }

}, {
    timestamps: true
});

// ============ INDEXES ============
activityEventSchema.index({ sessionId: 1, timestamp: -1 });
activityEventSchema.index({ touristId: 1, timestamp: -1 });
activityEventSchema.index({ eventType: 1, timestamp: -1 });
activityEventSchema.index({ 'emergency.isPanic': 1 }); // Quick panic event lookup
activityEventSchema.index({ location: '2dsphere' }); // Geospatial queries

// ============ VIRTUAL FIELDS ============

// Check if this is an emergency event
activityEventSchema.virtual('isEmergency').get(function () {
    return ['panic_button', 'sos', 'device_shake'].includes(this.eventType);
});

// Check if event needs acknowledgment
activityEventSchema.virtual('needsAcknowledgment').get(function () {
    return this.isEmergency && !this.isAcknowledged;
});

// ============ METHODS ============

// Mark event as acknowledged
activityEventSchema.methods.acknowledge = async function (officerId) {
    this.isAcknowledged = true;
    this.acknowledgedAt = new Date();
    this.acknowledgedBy = officerId;
    return await this.save();
};

// Create panic alert from this event
activityEventSchema.methods.createPanicAlert = async function () {
    // This will be implemented when we create the Alert model
    // For now, just set the flag
    this.emergency.isPanic = true;
    this.emergency.severity = 'critical';
    return await this.save();
};

// ============ STATIC METHODS ============

// Get activity timeline for a session
activityEventSchema.statics.getSessionActivities = function (sessionId) {
    return this.find({ sessionId })
        .sort({ timestamp: -1 })
        .populate('acknowledgedBy', 'fullname badgeNumber');
};

// Find last activity for a tourist
activityEventSchema.statics.getLastActivity = function (touristId) {
    return this.findOne({ touristId })
        .sort({ timestamp: -1 });
};

// Find all panic events (for dashboard)
activityEventSchema.statics.findPanicEvents = function (sessionId = null) {
    const query = {
        eventType: { $in: ['panic_button', 'sos', 'device_shake'] }
    };

    if (sessionId) {
        query.sessionId = sessionId;
    }

    return this.find(query)
        .sort({ timestamp: -1 })
        .populate('touristId sessionId');
};

// Find unacknowledged emergencies
activityEventSchema.statics.findUnacknowledgedEmergencies = function () {
    return this.find({
        eventType: { $in: ['panic_button', 'sos', 'device_shake'] },
        isAcknowledged: false
    }).populate('touristId sessionId');
};

// Check for inactivity (no events in X minutes)
activityEventSchema.statics.checkInactivity = async function (sessionId, thresholdMinutes = 120) {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const lastActivity = await this.findOne({ sessionId })
        .sort({ timestamp: -1 });

    if (!lastActivity) {
        return { isInactive: true, lastActivity: null };
    }

    return {
        isInactive: lastActivity.timestamp < threshold,
        lastActivity: lastActivity.timestamp,
        minutesSinceActivity: (Date.now() - lastActivity.timestamp) / (60 * 1000)
    };
};

// Get check-in history
activityEventSchema.statics.getCheckInHistory = function (sessionId) {
    return this.find({
        sessionId,
        eventType: 'check_in'
    }).sort({ timestamp: -1 });
};

const ActivityEvent = mongoose.model('ActivityEvent', activityEventSchema);

export default ActivityEvent;
