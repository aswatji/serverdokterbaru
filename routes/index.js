// routes/index.js
// ✅ Final version — route aggregator for DokterApp API

import express from "express";

// Import all route modules
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import doctorRoutes from "./doctorRoutes.js";
import messageRoutes from "./messageRoutes.js";
import chatRoutes from "./chatRoutes.js";
import paymentRoutes from "./paymentRoutes.js";
import newsRoutes from "./newsRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import categoryDoctorRoutes from "./categoryDoctorRoutes.js";
import ratingRoutes from "./ratingRoutes.js";
import uploadRoutes from "./uploadRoutes.js";
import chatUploadRoutes from "./chatUploadRoutes.js";

// Export function yang nerima io parameter
export default function routes(io) {
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
     💬 CHAT & MESSAGES - pass io ke chatRoutes!
  ------------------------------------------- */
  router.use("/chat", chatRoutes(io));
  router.use("/chat", chatUploadRoutes); // WhatsApp-style upload
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
     ⭐ DOCTOR RATINGS
  ------------------------------------------- */
  router.use("/ratings", ratingRoutes);

  /* -------------------------------------------
     📤 UPLOADS
  ------------------------------------------- */
  router.use("/upload", uploadRoutes);

  /* -------------------------------------------
     🧭 404 HANDLER
  ------------------------------------------- */
  router.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.originalUrl}`,
    });
  });

  return router;
}
