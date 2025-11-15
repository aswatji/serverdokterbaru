import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

// ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import routes from "./routes/index.js";
import errorHandler from "./middleware/errorHandler.js";
import {
  initChatSocket,
  stopDoctorAvailabilityNotification,
} from "./chatSocket.js";
import prisma, { dbConnection } from "./config/database.js";
import chatRoutes from "./routes/chatRoutes.js";
import { ensureDbConnection, healthCheck } from "./middleware/dbMiddleware.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Environment configuration
const PORT = process.env.PORT || 80; // CapRover uses port 80 internally
const isDevelopment = process.env.NODE_ENV !== "production";

// ✅ Buat instance Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  path: "/socket.io/", // ⬅️ tambahkan ini
  transports: ["websocket"], // pastikan langsung websocket
});

// ✅ Inisialisasi Socket.IO
initChatSocket(io);

console.log("🚀 Starting Dokter App Server...");

// ==================================================
// 🚀 Jalankan server utama
// ==================================================
async function startServer() {
  try {
    // ✅ Try to connect to database, but don't block server startup
    console.log("🔌 Testing database connection...");
    const dbConnected = await dbConnection.testConnection().catch((err) => {
      console.error(
        "⚠️  Database connection failed (will retry):",
        err.message
      );
      return false;
    });

    if (!dbConnected) {
      console.log(
        "⚠️  Starting server without database (will reconnect automatically)"
      );
    } else {
      console.log("✅ Database connected successfully!");
    }

    if (process.env.NODE_ENV === "production") {
      console.log("⏳ Production startup delay (3 seconds)...");
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // ✅ Security & performance middleware
    // Configure helmet to allow WebSocket connections
    app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP to allow WebSocket
        crossOriginEmbedderPolicy: false,
      })
    );
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

    // ✅ Body parser
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // ✅ Serve static files (HTML test clients)
    app.use(express.static("."));

    // ✅ Serve uploaded files with CORS and cache (fallback from MinIO)
    app.use(
      "/uploads",
      express.static(path.join(__dirname, "uploads"), {
        setHeaders: (res, filePath) => {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET");
          res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache 1 year
        },
      })
    );

    // ✅ Database health check middleware - ONLY for /api routes (not for socket.io)
    app.use("/api", ensureDbConnection);

    // ✅ Health check endpoint - WITHOUT /api prefix for CapRover
    app.get("/health", (req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        port: PORT,
      });
    });

    // ✅ Health check endpoint - WITH /api prefix
    app.get("/api/health", healthCheck);

    // ✅ Request timeout middleware - 15 detik max
    app.use((req, res, next) => {
      req.setTimeout(15000); // 15 second timeout
      res.setTimeout(15000);
      next();
    });

    // ✅ Routes - pass io to routes
    app.use("/api", routes(io));

    // ✅ Health check
    app.get("/", (req, res) => {
      res.json({
        success: true,
        message: "Consultation Chat App API",
        version: "3.0.0",
        description: "API for consultation chat app with paid sessions",
        endpoints: {
          health: "/api/health",
          users: "/api/users",
          doctors: "/api/doctors",
          messages: "/api/messages",
          payments: "/api/payments",
          news: "/api/news",
          categories: "/api/categories",
          ratings: "/api/ratings",
          chat: "/api/chat",
          upload: "/api/upload",
        },
      });
    });

    // ✅ Error handler
    app.use(errorHandler);

    // ✅ Handle route tidak ditemukan
    app.use("*", (req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });

    // ✅ Jalankan server HTTP + Socket.IO - Bind to 0.0.0.0 for Docker
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Health check (CapRover): http://localhost:${PORT}/health`);
      console.log(`Health check (API): http://localhost:${PORT}/api/health`);
      console.log(`Chat Socket.IO server initialized for real-time messaging`);
    });

    // ✅ Monitoring memori (opsional)
    if (process.env.NODE_ENV === "production") {
      console.log("📊 Memory monitoring started");
      setInterval(() => {
        const memUsage = process.memoryUsage();
        console.log(
          `Memory usage: RSS: ${Math.round(
            memUsage.rss / 1024 / 1024
          )}MB, Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
        );
      }, 60000);
    }

    console.log("✅ Server initialization complete");
  } catch (error) {
    console.error("💥 Server startup failed:", error);
    process.exit(1);
  }
}

// ==================================================
// 🧹 Shutdown Gracefully
// ==================================================
async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    stopDoctorAvailabilityNotification();
    await prisma.$disconnect();
    console.log("Database disconnected");

    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.log("Force exit after timeout");
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// ✅ Signal handlers
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});

startServer();
