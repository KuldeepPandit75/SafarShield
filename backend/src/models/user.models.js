import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // Blockchain Identity
    touristId: {
      type: String, // Wallet Address (Blockchain ID)
      required: true,
      unique: true,
      index: true,
    },

    // Personal Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    // Aadhaar hash (never store real Aadhaar)
    aadhaarHash: {
      type: String,
      required: true,
    }, 
    role:{
        type :Number,
        default:0,
    },

    // Blockchain Proof
    txHash: {
      type: String,
      required: true,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },

    // Optional fields
    emergencyContact: {
      type: String,
      default: null,
    },

    location: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
