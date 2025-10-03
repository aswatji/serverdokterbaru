// routes/index.js
// Setup Express routes for auth, payment, chat, and doctor schedule.

const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const doctorRoutes = require("./doctorRoutes");
const consultationRoutes = require("./consultationRoutes");
const messageRoutes = require("./messageRoutes");
const chatRoutes = require("./chatRoutes");
const paymentRoutes = require("./paymentRoutes");
const newsRoutes = require("./newsRoutes");
const categoryRoutes = require("./categoryRoutes");
const categoryDoctorRoutes = require("./routes/categoryDoctorRoutes");
const {
  authMiddleware,
  requireDoctor,
} = require("../middleware/authMiddleware");

const router = express.Router();


// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Consultation App Server is running",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
  });
});

// API routes with authentication requirements

// 1. POST /auth/register → authController.register
// 2. POST /auth/login → authController.login
router.use("/auth", authRoutes);

// 3. POST /payment/create → paymentController.createPayment (auth required)
// 4. POST /payment/callback → paymentController.midtransCallback
router.use("/payment", paymentRoutes);

// 5. POST /chat/send → chatController.sendMessage (auth required)
// 6. GET /chat/messages/:consultationId → chatController.getMessages (auth required)
router.use("/chat", chatRoutes);

// 7. POST /doctor/schedules → doctorController.addSchedule (auth + role doctor)
// 8. GET /doctor/schedules/:doctorId → doctorController.getSchedules
// 9. PUT /doctor/schedules/:scheduleId → doctorController.updateSchedule
// 10. DELETE /doctor/schedules/:scheduleId → doctorController.deleteSchedule
router.use("/doctor", doctorRoutes);

// Other existing routes
router.use("/users", userRoutes);
router.use("/consultations", consultationRoutes);
router.use("/messages", messageRoutes);
router.use("/news", newsRoutes);
router.use("/categories", categoryRoutes);
router.use("/category-doctors", categoryDoctorRoutes);
module.exports = router;

