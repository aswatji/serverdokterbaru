const express = require("express");
const userRoutes = require("./userRoutes");
const doctorRoutes = require("./doctorRoutes");
const consultationRoutes = require("./consultationRoutes");
const messageRoutes = require("./messageRoutes");
const chatRoutes = require("./chatRoutes");
const paymentRoutes = require("./paymentRoutes");
const newsRoutes = require("./newsRoutes");
const categoryRoutes = require("./categoryRoutes");

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Consultation App Server is running",
    timestamp: new Date().toISOString(),
    version: "2.0.0"
  });
});

// API routes
router.use("/users", userRoutes);
router.use("/doctors", doctorRoutes);
router.use("/consultations", consultationRoutes);
router.use("/messages", messageRoutes);
router.use("/chats", chatRoutes);
router.use("/payments", paymentRoutes);
router.use("/news", newsRoutes);
router.use("/categories", categoryRoutes);

module.exports = router;
