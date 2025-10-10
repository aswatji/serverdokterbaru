// routes/paymentRoutes.js
// ✅ Final version — Payment routes (Prisma-based, chat auto-create)

const express = require("express");
const { body } = require("express-validator");
const paymentController = require("../controllers/paymentController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createPaymentValidation = [
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("amount")
    .isFloat({ min: 1000 })
    .withMessage("Amount must be greater than 0"),
];

/* -------------------------------------------
   💰 PAYMENT ROUTES
------------------------------------------- */

// ✅ Buat pembayaran baru
router.post(
  "/create",
  authMiddleware,
  createPaymentValidation,
  validateRequest,
  paymentController.createPayment
);

// ✅ Callback dari Midtrans (tidak perlu auth)
router.post("/callback", paymentController.midtransCallback);

// ✅ Cek status pembayaran berdasarkan orderId
router.get(
  "/status/:orderId",
  authMiddleware,
  paymentController.checkPaymentStatus
);

// ✅ Ambil semua pembayaran user login
router.get("/", authMiddleware, paymentController.getUserPayments);

// ✅ (Opsional) Ambil detail pembayaran by ID (admin)
router.get("/:id", authMiddleware, paymentController.getPaymentById);

// ✅ (Opsional) Update status pembayaran (admin)
router.put("/:id", authMiddleware, paymentController.updatePaymentStatus);

// ✅ (Opsional) Hapus pembayaran (admin)
router.delete("/:id", authMiddleware, paymentController.deletePayment);

module.exports = router;
