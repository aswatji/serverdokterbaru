// routes/index.js
// ✅ Final version — route aggregator for DokterApp API

const express = require("express");

// Import all route modules
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const doctorRoutes = require("./doctorRoutes");
const messageRoutes = require("./messageRoutes");
const chatRoutes = require("./chatRoutes");
const paymentRoutes = require("./paymentRoutes");
const newsRoutes = require("./newsRoutes");
const categoryRoutes = require("./categoryRoutes");
const categoryDoctorRoutes = require("./categoryDoctorRoutes");

const router = express.Router();

/* -------------------------------------------
   🩺 HEALTH CHECK
------------------------------------------- */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "🚀 DokterApp API is running smoothly",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
  });
});

/* -------------------------------------------
   🔐 AUTHENTICATION
------------------------------------------- */
router.use("/auth", authRoutes);

/* -------------------------------------------
   💰 PAYMENTS
------------------------------------------- */
router.use("/payment", paymentRoutes);

/* -------------------------------------------
   💬 CHAT & MESSAGES
------------------------------------------- */
router.use("/chat", chatRoutes);
router.use("/messages", messageRoutes);

/* -------------------------------------------
   👨‍⚕️ DOCTORS
------------------------------------------- */
router.use("/doctor", doctorRoutes);

/* -------------------------------------------
   👤 USERS
------------------------------------------- */
router.use("/users", userRoutes);

/* -------------------------------------------
   📰 NEWS & CATEGORIES
------------------------------------------- */
router.use("/news", newsRoutes);
router.use("/categories", categoryRoutes);
router.use("/category-doctors", categoryDoctorRoutes);

/* -------------------------------------------
   🧭 404 HANDLER
------------------------------------------- */
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

module.exports = router;
