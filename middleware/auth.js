const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided, authorization denied",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token is not valid",
    });
  }
};

// Helper function to generate JWT token
const generateToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn,
  });
};

// Helper function to verify JWT token (for Socket.IO)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
  } catch (error) {
    throw new Error("Invalid token");
  }
};

module.exports = {
  authMiddleware,
  generateToken,
  verifyToken,
};
