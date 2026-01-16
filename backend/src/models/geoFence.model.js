import mongoose from 'mongoose';

// GeoFence Model: Define geographic boundaries for safety monitoring
// Used to detect when tourists leave safe zones or enter restricted areas
const geoFenceSchema = new mongoose.Schema({

    // Fence identification
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },

    description: {
        type: String,
        maxlength: 1000
    },

    // Fence type determines behavior
    // safe_zone: Tourist should stay within this area
    // restricted_area: Tourist should NOT enter this area
    fenceType: {
        type: String,
        enum: ['safe_zone', 'restricted_area'],
        required: true,
        index: true
    },

    // GeoJSON geometry (polygon or circle)
    geometry: {
        type: {
            type: String,
            enum: ['Polygon', 'Point'], // Point for circular fences
            required: true
        },
        coordinates: {
            type: mongoose.Schema.Types.Mixed,
            required: true
            // For Polygon: [[[lon, lat], [lon, lat], ...]]
            // For Point: [lon, lat]
        }
    },

    // For circular geo-fences (when type is 'Point')
    radius: {
        type: Number, // meters
        min: 0,
        validate: {
            validator: function (value) {
                // Radius required if geometry type is Point
                if (this.geometry.type === 'Point') {
                    return value && value > 0;
                }
                return true;
            },
            message: 'Radius is required for circular geo-fences'
        }
    },

    // Administrative info
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Admin user who created this fence
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },

    // Region/jurisdiction
    region: {
        type: String,
        index: true // e.g., "Northeast India", "Kashmir", "Ladakh"
    },

    jurisdiction: {
        type: String // Police jurisdiction
    },

    // Risk level for the area
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'extreme'],
        default: 'medium'
    },

    // Usage statistics
    usageStats: {
        sessionsUsing: {
            type: Number,
            default: 0
        },
        breachCount: {
            type: Number,
            default: 0
        },
        lastBreachAt: Date
    },

    // Additional metadata
    tags: [{
        type: String,
        trim: true
    }], // e.g., ["tourist-spot", "high-altitude", "restricted-border"]

    // Contact info for this area
    localAuthorities: [{
        name: String,
        role: String,
        phone: String,
        email: String
    }]

}, {
    timestamps: true
});

// ============ INDEXES ============
// Geospatial index for location queries
geoFenceSchema.index({ geometry: '2dsphere' });
geoFenceSchema.index({ fenceType: 1, isActive: 1 });
geoFenceSchema.index({ region: 1, isActive: 1 });

// ============ VIRTUAL FIELDS ============

// Get area in square kilometers (approximate for polygons)
geoFenceSchema.virtual('approximateAreaKm2').get(function () {
    if (this.geometry.type === 'Point' && this.radius) {
        // Area of circle: π * r²
        const areaM2 = Math.PI * Math.pow(this.radius, 2);
        return areaM2 / 1000000; // Convert to km²
    }
    // For polygons, would need more complex calculation
    return null;
});

// ============ METHODS ============

// Check if a point is inside this geo-fence
// Returns true if point is within safe_zone or outside restricted_area
geoFenceSchema.methods.containsPoint = async function (longitude, latitude) {
    const GeoFence = this.constructor;

    // Use MongoDB geospatial query
    const result = await GeoFence.findOne({
        _id: this._id,
        geometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                }
            }
        }
    });

    return !!result;
};

// Check if point violates this fence (considering fence type)
geoFenceSchema.methods.isViolated = async function (longitude, latitude) {
    const contains = await this.containsPoint(longitude, latitude);

    if (this.fenceType === 'safe_zone') {
        // Violation: Tourist is OUTSIDE safe zone
        return !contains;
    } else if (this.fenceType === 'restricted_area') {
        // Violation: Tourist is INSIDE restricted area
        return contains;
    }

    return false;
};

// Record a breach
geoFenceSchema.methods.recordBreach = async function () {
    this.usageStats.breachCount += 1;
    this.usageStats.lastBreachAt = new Date();
    return await this.save();
};

// Increment session usage
geoFenceSchema.methods.incrementUsage = async function () {
    this.usageStats.sessionsUsing += 1;
    return await this.save();
};

// Decrement session usage (when session ends)
geoFenceSchema.methods.decrementUsage = async function () {
    if (this.usageStats.sessionsUsing > 0) {
        this.usageStats.sessionsUsing -= 1;
    }
    return await this.save();
};

// ============ STATIC METHODS ============

// Find all active geo-fences in a region
geoFenceSchema.statics.findByRegion = function (region) {
    return this.find({
        region,
        isActive: true
    });
};

// Find geo-fences containing a point
geoFenceSchema.statics.findContainingPoint = function (longitude, latitude) {
    return this.find({
        isActive: true,
        geometry: {
            $geoIntersects: {
                $geometry: {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                }
            }
        }
    });
};

// Find all safe zones
geoFenceSchema.statics.findSafeZones = function (region = null) {
    const query = {
        fenceType: 'safe_zone',
        isActive: true
    };

    if (region) {
        query.region = region;
    }

    return this.find(query);
};

// Find all restricted areas
geoFenceSchema.statics.findRestrictedAreas = function (region = null) {
    const query = {
        fenceType: 'restricted_area',
        isActive: true
    };

    if (region) {
        query.region = region;
    }

    return this.find(query);
};

// Check if location violates any geo-fences
geoFenceSchema.statics.checkViolations = async function (longitude, latitude) {
    // Find all fences containing this point
    const containingFences = await this.findContainingPoint(longitude, latitude);

    const violations = [];

    for (const fence of containingFences) {
        if (fence.fenceType === 'restricted_area') {
            // Inside a restricted area = violation
            violations.push({
                fenceId: fence._id,
                name: fence.name,
                type: 'restricted_area_entry',
                severity: fence.riskLevel
            });
        }
    }

    // Check if outside all safe zones
    const safeZones = await this.findSafeZones();
    let insideAnySafeZone = false;

    for (const safeZone of safeZones) {
        const isInside = await safeZone.containsPoint(longitude, latitude);
        if (isInside) {
            insideAnySafeZone = true;
            break;
        }
    }

    if (!insideAnySafeZone && safeZones.length > 0) {
        violations.push({
            type: 'safe_zone_exit',
            severity: 'medium'
        });
    }

    return violations;
};

const GeoFence = mongoose.model('GeoFence', geoFenceSchema);

export default GeoFence;
