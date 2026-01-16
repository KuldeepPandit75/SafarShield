import userModel from "../models/user.models.js";
import userService from "../services/user.service.js";
import { validationResult } from "express-validator";
import BlacklistToken from "../models/blacklistToken.model.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import bcrypt from 'bcrypt';
import { client } from "../integrations/cache/redis.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullname, email, password, role, username } = req.body;

  const existingUser = await userModel.findOne({ username });

  if (existingUser) {
    return res.status(400).json({ message: "Username already exists" });
  }

  const existingEmail = await userModel.findOne({ email });
  if (existingEmail) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userService.createUser({
    fullname: {
      firstname: fullname.firstname,
      lastname: fullname.lastname,
    },
    email,
    password: hashedPassword,
    role,
    username,
  });

  const token = user.generateAuthToken();

  res.cookie("token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 365 * 5,
  });

  res.status(201).json({ token, user });
};

export const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: "Invalid email or password", errors: errors.array() });
  }

  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = user.generateAuthToken();

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 * 365 * 5,
  });

  res.status(200).json({ token, user });
};

export const getMe = async (req, res) => {
  const user = await userModel.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({ user });
};

export const logoutUser = async (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  await BlacklistToken.create({ token });

  res.status(200).json({ message: "Logged out successfully" });
};

export const updateUser = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const allowedUpdates = [
    "fullname",
    "username",
    "avatar",
    "bio",
    "location",
    "college",
    "skills",
    "interests",
    "social",
    "featuredProject",
    "achievements",
  ];

  const updates = {};

  Object.keys(req.body).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle featured projects update
  if (req.body.featuredProjects) {
    updates.featuredProject = {
      title: req.body.featuredProjects.title,
      description: req.body.featuredProjects.description,
      link: req.body.featuredProjects.link,
      techUsed: req.body.featuredProjects.techUsed,
    };
  }

  try {
    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Username or email already exists",
      });
    }
    res.status(400).json({ message: error.message });
  }
};

export const checkUsernameAvailability = async (req, res) => {
  const { username } = req.params;
  console.log("working");

  if (!username) {
    return res.status(400).json({
      message: "Username is required",
    });
  }

  try {
    const existingUser = await userModel.findOne({ username });

    res.status(200).json({
      available: !existingUser,
      message: existingUser
        ? "Username is already taken"
        : "Username is available",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error checking username availability",
    });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
      resource_type: "auto",
    });

    // Update user's avatar
    const user = await userModel.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    );

    if (!user) {
      // Clean up file if user not found
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    // Delete the temporary file after successful upload
    await fs.unlink(req.file.path);

    res.status(200).json({
      message: "Profile picture updated successfully",
      avatar: result.secure_url,
    });
  } catch (error) {
    // If there's an error, try to clean up the temporary file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning up temporary file:", cleanupError);
      }
    }
    res.status(500).json({
      message: "Error updating profile picture",
      error: error.message,
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { email, name, picture, googleId } = req.body;

    // Check if user exists
    let user = await userModel.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist
      const username =
        email.split("@")[0] + Math.random().toString(36).substring(2, 8);
      const [firstname, ...lastnameParts] = name.split(" ");
      const lastname = lastnameParts.join(" ");

      user = await userService.createUser({
        fullname: {
          firstname,
          lastname,
        },
        email,
        password: Math.random().toString(36).slice(-8), // Random password for Google users
        role: "user",
        username,
        avatar: picture,
        googleId,
        isVerified: true,
      });
    } else if (!user.googleId) {
      // Update existing user with Google ID if not already set
      user.googleId = googleId;
      if (!user.avatar) {
        user.avatar = picture;
      }
      await user.save();
    }

    const token = user.generateAuthToken();
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 365 * 5 // 5 year
    });
    res.status(200).json({ token, user });
  } catch (error) {
    console.error("Google login error:", error);
    res
      .status(500)
      .json({ message: "Error during Google login", error: error.message });
  }
};

export const getUserProfileByUsername = async (req, res) => {
  const { username } = req.params;
  const user = await userModel.findOne({ username }).select("-googleId -password -role -isVerified -createdAt -updatedAt -__v -otp");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({ user });
};

export const updateSocketId = async (req, res) => {
  const { socketId, userId } = req.body;

  const user = await userModel.findById(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  user.socketId = socketId;
  await user.save();

  res.status(200).json({ message: 'Socket ID updated successfully' });
};

export const getUserBySocketId = async (req, res) => {
  const { socketId } = req.params;
  console.log(socketId)
  const user = await userModel.findOne({ socketId });
  if (!user) {
    console.log('User not found')
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({ user });
};


// Notification endpoints
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await userModel.findById(userId).populate('notifications.senderId', 'fullname avatar username');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Sort notifications by creation date (newest first)
    const notifications = user.notifications.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.status(200).json({ notifications });
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notification = (user.notifications).id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.isRead = true;
    await user.save();

    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.notifications.forEach((notification) => {
      notification.isRead = true;
    });

    await user.save();

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const unreadCount = user.notifications.filter((notification) => !notification.isRead).length;

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getUserLocation = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  const existed = await client.exists(userId);
  if (!existed) {
    throw new ApiError(404, "User location not found");
  }

  const data = await client.hgetall(userId);

  return res.status(200).json(new ApiResponse(200, data, "Location fetched"));
})

export const updateUserLocation = async (req, res) => {
  const { userId } = req.params;
  const { lat, longitude, s, heading } = req.query;

  const existed = await client.exists(userId);

  const fieldsAdded = await client.hset(
    userId,
    {
      userId: userId,
      lat: lat,
      lng: longitude,
      speed: s,
      heading: heading,
      updated_at: new Date().toISOString()
    }
  );

  console.log({ userId, fieldsAdded, existed: Boolean(existed) });
  return res.json({ status: existed ? 'updated' : 'created' });
}

