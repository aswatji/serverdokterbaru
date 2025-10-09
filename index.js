require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const http = require("http");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const {
  initChatSocket,
  stopDoctorAvailabilityNotification,
} = require("./chatSocket");
const ConsultationScheduler = require("./scheduler/consultationScheduler");
const prisma = require("./config/database");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const chatRoutes = require("./routes/chatRoutes");

console.log("🚀 Starting Dokter App Server...");

// Function to test database connection with retry
async function testDatabaseConnection(retries = 5) {
  for (let i = 1; i <= retries; i++) {
    try {
      console.log(`Testing database connection... (${i}/${retries})`);
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection successful");
      return true;
    } catch (error) {
      console.error(
        `❌ Database connection failed (attempt ${i}/${retries}):`,
        error.message
      );
      if (i === retries) {
        console.error(
          "💥 Failed to connect to database after",
          retries,
          "attempts"
        );
        process.exit(1);
      }
      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

// Production startup delay to prevent immediate crashes
async function startServer() {
  try {
    // Test database connection first
    await testDatabaseConnection();

    // Production environment stabilization delay
    if (process.env.NODE_ENV === "production") {
      console.log("⏳ Production startup delay (3 seconds)...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Middleware
    app.use(helmet());
    app.use(compression());
    app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://your-frontend-domain.com"]
            : [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
              ],
        credentials: true,
      })
    );

    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Routes
    app.use("/api", routes);
    app.use("/api/chat", chatRoutes);

    // Root endpoint
    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Consultation Chat App API",
        version: "2.0.0",
        description: "API for consultation chat app with paid sessions",
        endpoints: {
          health: "/api/health",
          users: "/api/users",
          doctors: "/api/doctors",
          consultations: "/api/consultations",
          messages: "/api/messages",
          payments: "/api/payments",
          news: "/api/news",
          categories: "/api/categories",
        },
        features: [
          "User & Doctor Management",
          "Paid Consultation Sessions",
          "Real-time Chat",
          "Payment Integration (Midtrans)",
          "Doctor Schedules",
          "News & Categories",
        ],
      });
    });

    // Error handling middleware
    app.use(errorHandler);

    // 404 handler
    app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // Initialize Socket.IO
    console.log("🔌 Initializing Socket.IO...");
    initChatSocket(server);

    // Start server
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Chat Socket.IO server initialized for real-time messaging`);
    });

    // Memory monitoring for production
    if (process.env.NODE_ENV === "production") {
      console.log("📊 Memory monitoring started");
      setInterval(() => {
        const memUsage = process.memoryUsage();
        console.log(
          `Memory usage: RSS: ${Math.round(
            memUsage.rss / 1024 / 1024
          )}MB, Heap Used: ${Math.round(
            memUsage.heapUsed / 1024 / 1024
          )}MB, Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        );
      }, 60000); // Every 60 seconds
    }

    // Initialize Consultation Scheduler with delay
    setTimeout(() => {
      console.log("📅 Initializing Consultation Scheduler...");
      try {
        global.consultationScheduler = new ConsultationScheduler();
        global.consultationScheduler.start();
        console.log("📅 Consultation scheduler started");
      } catch (error) {
        console.error("❌ Failed to start consultation scheduler:", error);
      }
    }, 5000); // Wait 5 seconds before starting scheduler
  } catch (error) {
    console.error("💥 Server startup failed:", error);
    process.exit(1);
  }
}

// Enhanced graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    if (global.consultationScheduler) {
      console.log("Stopping consultation scheduler...");
      global.consultationScheduler.stop();
    }

    stopDoctorAvailabilityNotification();

    await prisma.$disconnect();
    console.log("Database disconnected");

    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.log("Force exit after timeout");
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

// Start the server
startServer();
