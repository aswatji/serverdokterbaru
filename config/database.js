import { PrismaClient } from "@prisma/client";

// Singleton pattern untuk PrismaClient dengan connection pooling
const globalForPrisma = globalThis;

class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }

    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],

      // Connection pooling configuration
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Auto-reconnect on connection loss
    this.setupHealthCheck();

    DatabaseConnection.instance = this;
  }

  setupHealthCheck() {
    // Ping database every 30 seconds to keep connection alive
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        console.error("⚠️ Database health check failed:", error.message);
        // Connection will auto-reconnect on next query
      }
    }, 30000); // 30 seconds
  }

  async testConnection(retries = 5) {
    for (let i = 1; i <= retries; i++) {
      try {
        console.log(`Testing database connection... (${i}/${retries})`);
        await this.prisma.$queryRaw`SELECT 1`;
        console.log("✅ Database connection successful");
        return true;
      } catch (error) {
        console.error(
          `❌ Database connection failed (attempt ${i}/${retries}):`,
          error.message
        );

        if (i === retries) {
          console.error(
            "❌ Could not connect to database after",
            retries,
            "attempts"
          );
          throw error;
        }

        // Wait before retry (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, i - 1), 10000);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    try {
      await this.prisma.$disconnect();
      console.log("✅ Database disconnected gracefully");
    } catch (error) {
      console.error("❌ Error disconnecting:", error);
    }
  }

  getInstance() {
    return this.prisma;
  }
}

// Create singleton instance
const dbConnection = globalForPrisma.dbConnection || new DatabaseConnection();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.dbConnection = dbConnection;
}

const prisma = dbConnection.getInstance();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️ ${signal} received. Closing database connection...`);
  await dbConnection.disconnect();
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("beforeExit", async () => {
  await dbConnection.disconnect();
});

export default prisma;
export { dbConnection };
