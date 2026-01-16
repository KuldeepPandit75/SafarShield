import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
    // Basic Identity
    fullname: {
        firstname: {
            type: String,
            required: true,
            minlength: [3, 'First name must be at least 3 characters long'],
            trim: true
        },
        lastname: {
            type: String,
            minlength: [3, 'Last name must be at least 3 characters long'],
            trim: true
        }
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },

    username: {
        type: String,
        required: true,
        unique: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        trim: true
    },

    password: {
        type: String,
        required: true,
        select: false // Never return password in queries by default
    },

    // Role-based access control (CRITICAL for Tourist Safety System)
    // tourist: regular users creating sessions for trips
    // police: officers monitoring alerts and sessions
    // admin: system administrators managing users and geo-fences
    role: {
        type: String,
        enum: ['tourist', 'police', 'admin'],
        default: 'tourist',
        required: true
    },

    // Privacy-first: NEVER store raw government IDs (Aadhaar/Passport)
    // Only store encrypted hash for verification purposes
    // This meets academic requirements for privacy compliance
    governmentIdHash: {
        type: String,
        select: false // Sensitive data, only fetch when explicitly needed
    },

    // Consent tracking (required for GDPR-like compliance)
    // User must explicitly agree to location tracking during active sessions
    consentGiven: {
        type: Boolean,
        default: false
    },

    consentDate: {
        type: Date
    },

    // OTP verification system (existing authentication flow)
    otp: {
        value: String,
        expiration: Date,
        tries: {
            type: Number,
            default: 3
        },
        attempts: {
            type: Number,
            default: 3
        }
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    // Profile information (minimal for safety system)
    avatar: {
        type: String,
        default: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
    },

    bio: {
        type: String,
        maxlength: 500
    },

    // Emergency contacts (CRITICAL for tourist safety)
    // Stored as array to support multiple contacts
    emergencyContacts: [{
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
        },
        email: {
            type: String,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        }
    }],

    // Police officer specific fields
    badgeNumber: {
        type: String,
        sparse: true, // Only required for police officers
        unique: true
    },

    department: {
        type: String
    },

    jurisdiction: {
        type: String // Geographic area of responsibility
    },

    // Real-time communication (Socket.io integration)
    socketId: {
        type: String
    },

    // Google OAuth support (existing functionality)
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    // Audit trail
    lastLoginAt: {
        type: Date
    },

    isActive: {
        type: Boolean,
        default: true
    },

    // Notifications for alerts and session updates
    notifications: [{
        type: {
            type: String,
            enum: ['alert', 'session_update', 'system'],
            required: true
        },
        message: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        // Reference to related alert if applicable
        alertId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Alert'
        }
    }]

}, {
    timestamps: true // Automatically creates createdAt and updatedAt
});

// Indexes for efficient queries (CRITICAL for production)
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'otp.expiration': 1 }); // For cleaning expired OTPs
userSchema.index({ socketId: 1 }); // For real-time lookups

// ============ METHODS ============

// Generate JWT token for authentication
// Includes role claim for authorization checks
userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign(
        {
            _id: this._id,
            email: this.email,
            role: this.role // CRITICAL: role included in token for access control
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
    return token;
};

// Compare passwords securely using bcrypt
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Hash government ID for privacy compliance
// NEVER store raw Aadhaar/Passport numbers
userSchema.methods.hashGovernmentId = function (rawId) {
    // Use SHA-256 with salt from environment for one-way hashing
    const salt = process.env.ID_HASH_SALT || 'default-salt-change-in-production';
    return crypto
        .createHmac('sha256', salt)
        .update(rawId)
        .digest('hex');
};

// Verify government ID without storing it
userSchema.methods.verifyGovernmentId = function (rawId) {
    const hashedInput = this.hashGovernmentId(rawId);
    return hashedInput === this.governmentIdHash;
};

// Update consent status
userSchema.methods.giveConsent = function () {
    this.consentGiven = true;
    this.consentDate = new Date();
    return this.save();
};

// ============ STATIC METHODS ============

// Find users by role (for admin dashboard)
userSchema.statics.findByRole = function (role) {
    return this.find({ role, isActive: true });
};

// Find available police officers for alert assignment
userSchema.statics.findAvailableOfficers = function (jurisdiction = null) {
    const query = {
        role: 'police',
        isActive: true
    };

    if (jurisdiction) {
        query.jurisdiction = jurisdiction;
    }

    return this.find(query).select('fullname badgeNumber department jurisdiction');
};

const User = mongoose.model('User', userSchema);

export default User;
