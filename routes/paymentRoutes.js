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

// Routes
// 3. POST /payment/create → paymentController.createPayment (auth required)
router.post(
  "/create",
  authMiddleware,
  createPaymentValidation,
  validateRequest,
  paymentController.createPayment
);

// 4. POST /payment/callback → paymentController.midtransCallback
router.post("/callback", paymentController.midtransCallback);

// Additional routes
router.get("/", authMiddleware, paymentController.getAllPayments);
router.get("/:id", authMiddleware, paymentController.getPaymentById);

module.exports = router;
