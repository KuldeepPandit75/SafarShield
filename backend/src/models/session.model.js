import mongoose from 'mongoose';
import crypto from 'crypto';

// Session Model: Represents a temporary, time-bound tourist trip
// CRITICAL PRINCIPLE: Sessions are NOT permanent tracking - they expire after the trip
// This is the core of the privacy-first design
const sessionSchema = new mongoose.Schema({

    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => `SESSION-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    },

    // Reference to the tourist who owns this session
    touristId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Trip details
    destination: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        maxlength: 1000
    },

    // Time-bound session (CRITICAL for privacy)
    // Tracking ONLY occurs between startDate and endDate
    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                return value > this.startDate;
            },
            message: 'End date must be after start date'
        }
    },

    // Session lifecycle states
    // pending: Created but not yet started tracking
    // active: Currently tracking location and monitoring for anomalies
    // completed: Trip finished normally
    // expired: Auto-expired after endDate
    // terminated: Manually ended early by user
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'expired', 'terminated'],
        default: 'pending',
        required: true
    },

    // CONSENT TRACKING (CRITICAL for legal compliance)
    // User must explicitly agree to location tracking
    consent: {
        given: {
            type: Boolean,
            required: true,
            default: false
        },
        timestamp: {
            type: Date
        },
        ipAddress: {
            type: String // For audit trail
        }
    },

    // Blockchain verification hash (minimal blockchain usage)
    // Used for tamper detection - ensures session data hasn't been modified
    // NOT actual blockchain storage, just hash for integrity verification
    sessionHash: {
        type: String,
        required: true
    },

    // Geographic boundaries for this trip (safety zones)
    // Tourist should stay within these boundaries
    geoFences: [{
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['safe_zone', 'restricted_area'],
            required: true
        },
        // GeoJSON Polygon format for MongoDB geospatial queries
        geometry: {
            type: {
                type: String,
                enum: ['Polygon'],
                required: true
            },
            coordinates: {
                type: [[[Number]]], // Array of array of array of numbers
                required: true
            }
        },
        radius: {
            type: Number, // meters, for circular safe zones
            min: 0
        }
    }],

    // Emergency contacts specific to this trip
    // May differ from user's default emergency contacts
    emergencyContacts: [{
        name: {
            type: String,
            required: true
        },
        relationship: String,
        phone: {
            type: String,
            required: true,
            match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
        },
        email: String,
        isPrimary: {
            type: Boolean,
            default: false
        }
    }],

    // Safety monitoring configuration
    checkInInterval: {
        type: Number, // Minutes between required check-ins
        default: 60, // Default: check in every hour
        min: 15,
        max: 1440 // Max 24 hours
    },

    inactivityThreshold: {
        type: Number, // Minutes of no activity before alert
        default: 120, // Default: 2 hours
        min: 30,
        max: 720 // Max 12 hours
    },

    // Last activity tracking (for anomaly detection)
    lastActivityAt: {
        type: Date
    },

    lastLocationAt: {
        type: Date
    },

    // Session activation/completion timestamps
    activatedAt: {
        type: Date
    },

    completedAt: {
        type: Date
    },

    terminatedAt: {
        type: Date
    },

    // Metadata
    deviceInfo: {
        deviceType: String,
        osVersion: String,
        appVersion: String
    },

    // Notes for police/admin
    adminNotes: {
        type: String
    },

    // Related alerts
    alertCount: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

// ============ INDEXES ============
sessionSchema.index({ touristId: 1, status: 1 });
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ endDate: 1 }); // For auto-expiry job
sessionSchema.index({ 'geoFences.geometry': '2dsphere' }); // Geospatial queries

// ============ VIRTUAL FIELDS ============

// Check if session is currently active and within date range
sessionSchema.virtual('isWithinDateRange').get(function () {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate;
});

// Check if session should auto-expire
sessionSchema.virtual('shouldExpire').get(function () {
    return new Date() > this.endDate && this.status === 'active';
});

// Trip duration in days
sessionSchema.virtual('durationDays').get(function () {
    const diff = this.endDate - this.startDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ============ METHODS ============

// Activate session (start tracking)
sessionSchema.methods.activate = async function () {
    if (!this.consent.given) {
        throw new Error('Cannot activate session without user consent');
    }

    if (!this.isWithinDateRange) {
        throw new Error('Cannot activate session outside date range');
    }

    this.status = 'active';
    this.activatedAt = new Date();
    this.lastActivityAt = new Date();

    return await this.save();
};

// Complete session normally
sessionSchema.methods.complete = async function () {
    this.status = 'completed';
    this.completedAt = new Date();
    return await this.save();
};

// Terminate session early (user cancels trip)
sessionSchema.methods.terminate = async function () {
    this.status = 'terminated';
    this.terminatedAt = new Date();
    return await this.save();
};

// Auto-expire session after end date
sessionSchema.methods.expire = async function () {
    this.status = 'expired';
    return await this.save();
};

// Grant consent
sessionSchema.methods.grantConsent = async function (ipAddress) {
    this.consent.given = true;
    this.consent.timestamp = new Date();
    this.consent.ipAddress = ipAddress;
    return await this.save();
};

// Update last activity timestamp
sessionSchema.methods.recordActivity = async function () {
    this.lastActivityAt = new Date();
    return await this.save();
};

// Update last location timestamp
sessionSchema.methods.recordLocation = async function () {
    this.lastLocationAt = new Date();
    this.lastActivityAt = new Date(); // Location update counts as activity
    return await this.save();
};

// Check if location is within safe geo-fences
sessionSchema.methods.isLocationSafe = function (latitude, longitude) {
    // If no geo-fences defined, consider all locations safe
    if (!this.geoFences || this.geoFences.length === 0) {
        return true;
    }

    // TODO: Implement actual geospatial query
    // This is a placeholder - actual implementation would use MongoDB $geoWithin
    return true;
};

// ============ STATIC METHODS ============

// Find active sessions for a tourist
sessionSchema.statics.findActiveSessions = function (touristId) {
    return this.find({
        touristId,
        status: 'active'
    });
};

// Find sessions that need to be expired (cron job)
sessionSchema.statics.findExpiredSessions = function () {
    return this.find({
        status: 'active',
        endDate: { $lt: new Date() }
    });
};

// Find sessions with no recent activity (anomaly detection)
sessionSchema.statics.findInactiveSessions = function (thresholdMinutes = 120) {
    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    return this.find({
        status: 'active',
        lastActivityAt: { $lt: threshold }
    });
};

const Session = mongoose.model('Session', sessionSchema);

export default Session;
