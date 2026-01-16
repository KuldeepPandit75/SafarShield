import mongoose from 'mongoose';

// LocationEvent Model: Records tourist location during active sessions
// CRITICAL DESIGN: Offline-tolerant and batched upload support
// Handles delayed, out-of-order events gracefully
const locationEventSchema = new mongoose.Schema({

    // Reference to the session this location belongs to
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

    // GeoJSON format for MongoDB geospatial queries
    // This enables efficient "find locations near X" or "within boundary" queries
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude] - NOTE: MongoDB uses lon,lat order
            required: true,
            validate: {
                validator: function (coords) {
                    return coords.length === 2 &&
                        coords[0] >= -180 && coords[0] <= 180 && // longitude
                        coords[1] >= -90 && coords[1] <= 90;      // latitude
                },
                message: 'Invalid coordinates format: [longitude, latitude]'
            }
        }
    },

    // Additional location metadata
    accuracy: {
        type: Number, // meters
        min: 0
    },

    altitude: {
        type: Number, // meters above sea level
    },

    speed: {
        type: Number, // meters per second
        min: 0
    },

    heading: {
        type: Number, // degrees from north (0-359)
        min: 0,
        max: 359
    },

    // CRITICAL TIMESTAMPS for offline handling
    // recordedAt: When the device captured this location
    // uploadedAt: When the server received it (may be much later)
    recordedAt: {
        type: Date,
        required: true,
        index: true // For sorting events chronologically
    },

    uploadedAt: {
        type: Date,
        default: Date.now,
        required: true
    },

    // Device battery level (CRITICAL for safety)
    // Low battery = potential device failure = safety risk
    battery: {
        level: {
            type: Number,
            min: 0,
            max: 100
        },
        isCharging: {
            type: Boolean,
            default: false
        }
    },

    // Offline sync detection
    // If device was offline, it may upload many events at once
    isOfflineSync: {
        type: Boolean,
        default: false
    },

    // Batch upload tracking
    batchId: {
        type: String // Same ID for all events uploaded in one batch
    },

    // Network quality at time of recording
    networkInfo: {
        type: {
            type: String,
            enum: ['wifi', '4g', '3g', '2g', 'offline', 'unknown']
        },
        strength: Number // Signal strength percentage
    },

    // Device information
    deviceInfo: {
        platform: String, // 'ios', 'android', 'web'
        osVersion: String
    },

    // Anomaly flags (set by detection service)
    flags: {
        outOfBounds: {
            type: Boolean,
            default: false
        },
        rapidMovement: {
            type: Boolean,
            default: false // Unusually fast movement between points
        },
        suspiciousGap: {
            type: Boolean,
            default: false // Large time gap since last location
        }
    }

}, {
    timestamps: true // createdAt, updatedAt
});

// ============ INDEXES ============
// Geospatial index for proximity queries
locationEventSchema.index({ location: '2dsphere' });

// Composite indexes for efficient queries
locationEventSchema.index({ sessionId: 1, recordedAt: -1 }); // Get session timeline
locationEventSchema.index({ touristId: 1, recordedAt: -1 }); // Get user history
locationEventSchema.index({ uploadedAt: 1 }); // For batch processing
locationEventSchema.index({ 'battery.level': 1 }); // Find low battery events

// ============ VIRTUAL FIELDS ============

// Calculate delay between recording and upload (offline duration)
locationEventSchema.virtual('uploadDelay').get(function () {
    if (!this.recordedAt || !this.uploadedAt) return null;
    return (this.uploadedAt - this.recordedAt) / 1000; // seconds
});

// Extract latitude from GeoJSON coordinates
locationEventSchema.virtual('latitude').get(function () {
    return this.location.coordinates[1];
});

// Extract longitude from GeoJSON coordinates
locationEventSchema.virtual('longitude').get(function () {
    return this.location.coordinates[0];
});

// Check if battery is critically low
locationEventSchema.virtual('isBatteryCritical').get(function () {
    return this.battery?.level < 20;
});

// ============ METHODS ============

// Flag this location as out of bounds
locationEventSchema.methods.flagOutOfBounds = async function () {
    this.flags.outOfBounds = true;
    return await this.save();
};

// Flag rapid movement anomaly
locationEventSchema.methods.flagRapidMovement = async function () {
    this.flags.rapidMovement = true;
    return await this.save();
};

// ============ STATIC METHODS ============

// Get location timeline for a session
locationEventSchema.statics.getSessionTimeline = function (sessionId, limit = 100) {
    return this.find({ sessionId })
        .sort({ recordedAt: -1 })
        .limit(limit)
        .select('location recordedAt battery flags');
};

// Find last known location for a tourist
locationEventSchema.statics.getLastKnownLocation = function (touristId) {
    return this.findOne({ touristId })
        .sort({ recordedAt: -1 })
        .select('location recordedAt battery sessionId');
};

// Find locations within a geographic boundary
locationEventSchema.statics.findWithinBoundary = function (polygon) {
    return this.find({
        location: {
            $geoWithin: {
                $geometry: polygon
            }
        }
    });
};

// Find locations near a point
locationEventSchema.statics.findNearPoint = function (longitude, latitude, maxDistanceMeters = 1000) {
    return this.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                },
                $maxDistance: maxDistanceMeters
            }
        }
    });
};

// Find events with low battery (safety concern)
locationEventSchema.statics.findLowBatteryEvents = function (threshold = 20) {
    return this.find({
        'battery.level': { $lte: threshold }
    }).populate('sessionId touristId');
};

// Find offline sync batches (for analysis)
locationEventSchema.statics.findOfflineSyncEvents = function (sessionId) {
    return this.find({
        sessionId,
        isOfflineSync: true
    }).sort({ recordedAt: 1 });
};

// Calculate distance between two location events (Haversine formula)
locationEventSchema.statics.calculateDistance = function (loc1, loc2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = loc1.location.coordinates[1] * Math.PI / 180;
    const φ2 = loc2.location.coordinates[1] * Math.PI / 180;
    const Δφ = (loc2.location.coordinates[1] - loc1.location.coordinates[1]) * Math.PI / 180;
    const Δλ = (loc2.location.coordinates[0] - loc1.location.coordinates[0]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
};

const LocationEvent = mongoose.model('LocationEvent', locationEventSchema);

export default LocationEvent;
