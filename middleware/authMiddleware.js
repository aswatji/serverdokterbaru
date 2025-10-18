import jwt from "jsonwebtoken";
import prisma from "../config/database.js";
import ApiResponse from "../utils/ApiResponse.js";
import MESSAGES from "../constants/messages.js";

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No valid token provided");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return ApiResponse.unauthorized(res, MESSAGES.UNAUTHORIZED);
    }

    // Verify JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if user exists (parallel query for performance)
    const [user, doctor] = await Promise.all([
      prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, fullname: true },
      }),
      prisma.doctor.findUnique({
        where: { id: decoded.id },
        select: { id: true, email: true, fullname: true },
      }),
    ]);

    const foundUser = user || doctor;

    if (!foundUser) {
      return ApiResponse.notFound(res, MESSAGES.USER_NOT_FOUND);
    }

    // Attach user to request
    req.user = {
      id: foundUser.id,
      email: foundUser.email,
      fullname: foundUser.fullname,
      type: doctor ? "doctor" : "user",
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return ApiResponse.unauthorized(res, MESSAGES.TOKEN_INVALID);
    }

    if (error.name === "TokenExpiredError") {
      return ApiResponse.unauthorized(res, MESSAGES.TOKEN_EXPIRED);
    }

    console.error("Auth middleware error:", error);
    return ApiResponse.serverError(res, "Authentication failed");
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, "Authentication required");
    }

    if (req.user.type !== role) {
      return ApiResponse.forbidden(res, `Access denied. ${role} role required`);
    }

    next();
  };
};

// Shortcuts for common roles
export const requireDoctor = requireRole("doctor");
export const requireUser = requireRole("user");

/**
 * Socket.IO authentication middleware
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication token required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // Check if user exists
    const [user, doctor] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.id } }),
      prisma.doctor.findUnique({ where: { id: decoded.id } }),
    ]);

    const foundUser = user || doctor;

    if (!foundUser) {
      return next(new Error("User not found"));
    }

    // Attach user to socket
    socket.user = {
      id: foundUser.id,
      email: foundUser.email,
      fullname: foundUser.fullname,
      type: doctor ? "doctor" : "user",
    };

    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
};

export default authMiddleware;
