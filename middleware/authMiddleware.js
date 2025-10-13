// // authMiddleware.js
// // JWT authentication middleware for Express and Socket.IO.

// const jwt = require("jsonwebtoken");

// // Requirements:
// // 1. Read token from Authorization header "Bearer <token>"
// // 2. Verify JWT using process.env.JWT_SECRET
// // 3. If valid, attach user info (id, email, role) to req.user
// // 4. If invalid, return 401 error
// // 5. Export function for use in routes

// const authMiddleware = (req, res, next) => {
//   try {
//     // 1. Read token from Authorization header "Bearer <token>"
//     const authHeader = req.header("Authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No valid token provided.",
//       });
//     }

//     const token = authHeader.replace("Bearer ", "");

//     if (!token) {
//       return res.status(401).json({
//         success: false,
//         message: "Access denied. No token provided.",
//       });
//     }

//     // 2. Verify JWT using process.env.JWT_SECRET
//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET || "your-secret-key"
//     );

//     // 3. If valid, attach user info (id, email, role) to req.user
//     req.user = {
//       id: decoded.id,
//       email: decoded.email,
//       type: decoded.type || "user", // 'user' or 'doctor'
//     };

//     next();
//   } catch (error) {
//     // 4. If invalid, return 401 error
//     console.error("Auth middleware error:", error.message);

//     if (error.name === "JsonWebTokenError") {
//       return res.status(401).json({
//         success: false,
//         message: "Invalid token.",
//       });
//     }

//     if (error.name === "TokenExpiredError") {
//       return res.status(401).json({
//         success: false,
//         message: "Token expired.",
//       });
//     }

//     return res.status(401).json({
//       success: false,
//       message: "Token verification failed.",
//     });
//   }
// };

// // Optional: Role-based middleware
// const requireRole = (role) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required.",
//       });
//     }

//     if (req.user.type !== role) {
//       return res.status(403).json({
//         success: false,
//         message: `Access denied. ${role} role required.`,
//       });
//     }

//     next();
//   };
// };

// // Optional: Doctor role middleware
// const requireDoctor = requireRole("doctor");

// // Optional: User role middleware
// const requireUser = requireRole("user");

// // Socket.IO authentication middleware
// const socketAuthMiddleware = (socket, next) => {
//   try {
//     const token =
//       socket.handshake.auth.token ||
//       socket.handshake.headers.authorization?.replace("Bearer ", "");

//     if (!token) {
//       return next(new Error("Authentication token required"));
//     }

//     const decoded = jwt.verify(
//       token,
//       process.env.JWT_SECRET || "your-secret-key"
//     );

//     socket.user = {
//       id: decoded.id,
//       email: decoded.email,
//       type: decoded.type || "user",
//     };

//     next();
//   } catch (error) {
//     console.error("Socket auth error:", error.message);
//     next(new Error("Invalid authentication token"));
//   }
// };

// // 5. Export function for use in routes
// module.exports = {
//   authMiddleware,
//   requireRole,
//   requireDoctor,
//   requireUser,
//   socketAuthMiddleware,
// };

// ======================================================
// ✅ AUTH MIDDLEWARE — JWT for Express + Socket.IO
// ======================================================

const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Express middleware:
 * 1️⃣ Baca token dari header Authorization ("Bearer <token>")
 * 2️⃣ Verifikasi JWT pakai process.env.JWT_SECRET
 * 3️⃣ Cek di database apakah user/doctor masih ada
 * 4️⃣ Jika valid, attach data user ke req.user
 * 5️⃣ Jika tidak valid → kirim 401
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No valid token provided.",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // 🔑 Verifikasi JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    // 🔍 Cek apakah user masih ada di DB (User atau Doctor)
    const user =
      (await prisma.user.findUnique({ where: { id: decoded.id } })) ||
      (await prisma.doctor.findUnique({ where: { id: decoded.id } }));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or deleted.",
      });
    }

    // 🧩 Attach user info ke req.user
    req.user = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      type: user.strNumber ? "doctor" : "user", // otomatis deteksi role
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Token verification failed.",
    });
  }
};

// ======================================================
// 🔐 ROLE-BASED MIDDLEWARE (Opsional)
// ======================================================
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.type !== role) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${role} role required.`,
      });
    }

    next();
  };
};

// Untuk route khusus doctor
const requireDoctor = requireRole("doctor");

// Untuk route khusus user
const requireUser = requireRole("user");

// ======================================================
// 🧠 SOCKET.IO AUTH MIDDLEWARE
// ======================================================
const socketAuthMiddleware = async (socket, next) => {
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

    const user =
      (await prisma.user.findUnique({ where: { id: decoded.id } })) ||
      (await prisma.doctor.findUnique({ where: { id: decoded.id } }));

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      type: user.strNumber ? "doctor" : "user",
    };

    next();
  } catch (error) {
    console.error("Socket auth error:", error.message);
    next(new Error("Invalid or expired authentication token"));
  }
};

// ======================================================
// ✅ EXPORT
// ======================================================
module.exports = {
  authMiddleware,
  requireRole,
  requireDoctor,
  requireUser,
  socketAuthMiddleware,
};
