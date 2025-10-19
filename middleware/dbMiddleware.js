import prisma from "../config/database.js";

/**
 * Middleware to ensure database connection is alive
 * Will attempt to reconnect if connection is lost
 */
export const ensureDbConnection = async (req, res, next) => {
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Quick health check
      await prisma.$queryRaw`SELECT 1`;
      return next();
    } catch (error) {
      lastError = error;
      console.error(`❌ Database connection check failed (attempt ${attempt}/${maxRetries}):`, error.message);

      if (attempt < maxRetries) {
        // Try to reconnect before next attempt
        try {
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          await prisma.$connect();
          console.log(`✅ Database reconnected on attempt ${attempt}`);
        } catch (reconnectError) {
          console.error(`⚠️ Reconnect attempt ${attempt} failed:`, reconnectError.message);
        }
      }
    }
  }

  // All retries failed
  console.error("❌ All database reconnection attempts failed");
  return res.status(503).json({
    success: false,
    message: "Database connection unavailable",
    error: "Service temporarily unavailable. Please try again later.",
  });
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
