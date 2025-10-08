const express = require("express");
const { body } = require("express-validator");
const paymentController = require("../controllers/paymentController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Validation rules
const createPaymentValidation = [
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("patientId").notEmpty().withMessage("Patient ID is required"),
  body("amount")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
];

// Buat pembayaran
router.post("/create", authMiddleware, paymentController.createPayment);

// Callback dari Midtrans
router.post("/callback", paymentController.midtransCallback);

// Cek status pembayaran
router.get(
  "/status/:orderId",
  authMiddleware,
  paymentController.getStatusByOrderId
);

// Get semua pembayaran
router.get("/", authMiddleware, paymentController.getAllPayments);

// Get by id
router.get("/:id", authMiddleware, paymentController.getPaymentById);

// Update status manual
router.put("/:id", authMiddleware, paymentController.updatePaymentStatus);

// Hapus pembayaran
router.delete("/:id", authMiddleware, paymentController.deletePayment);

module.exports = router;
