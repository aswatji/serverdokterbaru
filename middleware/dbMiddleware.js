import prisma from "../config/database.js";

/**
 * Middleware to ensure database connection is alive
 * Will attempt to reconnect if connection is lost
 */
export const ensureDbConnection = async (req, res, next) => {
  try {
    // Quick health check
    await prisma.$queryRaw`SELECT 1`;
    next();
  } catch (error) {
    console.error("❌ Database connection lost:", error.message);

    // Try to reconnect
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      console.log("✅ Database reconnected successfully");
      next();
    } catch (reconnectError) {
      console.error(
        "❌ Failed to reconnect to database:",
        reconnectError.message
      );
      return res.status(503).json({
        success: false,
        message: "Database connection unavailable",
        error: "Service temporarily unavailable. Please try again later.",
      });
    }
  }
};

/**
 * Database health check endpoint handler
 */
export const healthCheck = async (req, res) => {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      status: "healthy",
      database: {
        status: "connected",
        responseTime: `${responseTime}ms`,
      },
      server: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      database: {
        status: "disconnected",
        error: error.message,
      },
      server: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    });
  }
};

export default { ensureDbConnection, healthCheck };
