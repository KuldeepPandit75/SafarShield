import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        // Traditional Auth Fields
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        fullname: {
            firstname: {
                type: String,
                required: true,
                trim: true,
            },
            lastname: {
                type: String,
                trim: true,
            },
        },

        // Role-based access
        role: {
            type: String,
            enum: ["tourist", "officer", "admin"],
            default: "tourist",
        },

        // Blockchain Identity (Optional - for blockchain integration)
        touristId: {
            type: String, // Wallet Address
            unique: true,
            sparse: true,
        },

        // Privacy-compliant fields
        aadhaarHash: {
            type: String,
            select: false,
        },

        // Blockchain Proof (Optional)
        txHash: {
            type: String,
        },

        // Profile
        avatar: {
            type: String,
            default: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        },

        bio: {
            type: String,
            maxlength: 500,
        },

        // Safety features
        emergencyContacts: [
            {
                name: String,
                relationship: String,
                phone: String,
                email: String,
            },
        ],

        // Officer-specific fields
        badgeNumber: {
            type: String,
            unique: true,
            sparse: true,
        },

        department: String,
        jurisdiction: String,

        // Status & tracking
        isActive: {
            type: Boolean,
            default: true,
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        consentGiven: {
            type: Boolean,
            default: false,
        },

        consentDate: Date,

        lastLoginAt: Date,
        socketId: String,

        // Google OAuth
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },

        // Tokens for refresh
        refreshToken: {
            type: String,
        },

        // Notifications
        notifications: [
            {
                type: {
                    type: String,
                    enum: ["alert", "session_update", "system"],
                },
                message: String,
                isRead: {
                    type: Boolean,
                    default: false,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                alertId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Alert",
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Password verification
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            role: this.role,
        },
        process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "7d",
        }
    );
};

// Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "30d",
        }
    );
};

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ role: 1 });
userSchema.index({ touristId: 1 }, { sparse: true, unique: true });

export const User = mongoose.model("User", userSchema);
