require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 3000;

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
      categories: "/api/categories"
    },
    features: [
      "User & Doctor Management",
      "Paid Consultation Sessions",
      "Real-time Chat",
      "Payment Integration (Midtrans)",
      "Doctor Schedules",
      "News & Categories"
    ]
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
  console.log("Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
