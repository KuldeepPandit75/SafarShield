import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";
import { User } from "../models/user.models.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    // console.log(token);
    if (!token) {
      throw new ApiError(401, "Unauthorization request");
    }

    const decoderToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoderToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(404, "Invaild Access Token");
    }

    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invaild Access Token");
  }
});

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden: You don't have access");
    }
    next();
  };
};
export { verifyJWT, authorizeRoles };
