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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Database connection test function
async function testDatabaseConnection() {
  const prisma = require("./config/database");
  let retries = 5;
  
  while (retries > 0) {
    try {
      console.log(`Testing database connection... (${6-retries}/5)`);
      await prisma.$queryRaw`SELECT 1`;
      console.log("✅ Database connection successful");
      return true;
    } catch (error) {
      console.log(`❌ Database connection failed: ${error.message}`);
      retries--;
      if (retries > 0) {
        console.log(`Retrying in 2 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  console.error("❌ Failed to connect to database after 5 attempts");
  return false;
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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down gracefully...");
  stopMemoryMonitoring();
  if (global.consultationScheduler) {
    global.consultationScheduler.stop();
  }
  stopDoctorAvailabilityNotification();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  stopMemoryMonitoring();
  if (global.consultationScheduler) {
    global.consultationScheduler.stop();
  }
  stopDoctorAvailabilityNotification();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Memory monitoring
let memoryCheckInterval;
const startMemoryMonitoring = () => {
  memoryCheckInterval = setInterval(() => {
    const used = process.memoryUsage();
    const memoryInfo = {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024),
    };
    
    console.log(`Memory usage: RSS: ${memoryInfo.rss}MB, Heap Used: ${memoryInfo.heapUsed}MB, Heap Total: ${memoryInfo.heapTotal}MB`);
    
    // Alert if memory usage is high (over 200MB RSS)
    if (memoryInfo.rss > 200) {
      console.warn(`⚠️ High memory usage detected: ${memoryInfo.rss}MB RSS`);
    }
  }, 60000); // Check every minute
};

// Stop memory monitoring on shutdown
const stopMemoryMonitoring = () => {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }
};

// Async startup function with database check
async function startServer() {
  try {
    console.log("🚀 Starting Dokter App Server...");
    
    // Test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error("❌ Cannot start server without database connection");
      process.exit(1);
    }

    // Add startup delay for production stability
    if (process.env.NODE_ENV === "production") {
      console.log("⏳ Production startup delay (3 seconds)...");
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Initialize Chat Socket.IO
    console.log("🔌 Initializing Socket.IO...");
    initChatSocket(server);

    // Initialize Consultation Scheduler with delay
    console.log("📅 Initializing Consultation Scheduler...");
    const consultationScheduler = new ConsultationScheduler();
    
    // Start server first, then scheduler
    server.listen(PORT, async () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Chat Socket.IO server initialized for real-time messaging`);
      
      // Start memory monitoring
      startMemoryMonitoring();
      console.log(`📊 Memory monitoring started`);
      
      // Start scheduler after server is stable (5 second delay)
      setTimeout(() => {
        consultationScheduler.start();
        console.log("📅 Consultation scheduler started");
      }, 5000);
    });

    // Store scheduler reference for cleanup
    global.consultationScheduler = consultationScheduler;

  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
