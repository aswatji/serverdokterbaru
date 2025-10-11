// Enhanced signout with token blacklist (optional implementation)
// File: controllers/authController.js - Enhanced version

// You can add this to your authController.js if you want token blacklist functionality

class EnhancedAuthController {
  constructor() {
    // In-memory token blacklist (in production, use Redis)
    this.tokenBlacklist = new Set();
  }

  // Enhanced signout with token blacklist
  async enhancedSignout(req, res) {
    try {
      const token = req.header("Authorization")?.replace("Bearer ", "");
      const { id, type } = req.user;

      // Add token to blacklist
      this.tokenBlacklist.add(token);

      console.log(`${type} ${id} signed out at ${new Date()}`);
      console.log(`Token blacklisted: ${token.substring(0, 20)}...`);

      res.json({
        success: true,
        message: `${type} signed out successfully`,
        data: {
          signedOutAt: new Date(),
          message: "Token has been invalidated"
        }
      });
    } catch (error) {
      console.error("❌ Error signout:", error);
      res.status(500).json({
        success: false,
        message: "Failed to signout",
        error: error.message,
      });
    }
  }

  // Check if token is blacklisted (for middleware)
  isTokenBlacklisted(token) {
    return this.tokenBlacklist.has(token);
  }

  // Clean expired tokens from blacklist (call periodically)
  cleanExpiredTokens() {
    // This would require parsing JWT to check expiration
    // Implementation depends on your JWT structure
    console.log("Cleaning expired tokens from blacklist...");
  }
}

module.exports = EnhancedAuthController;