// ======================================================
// ✅ PAYMENT ROUTES — Prisma + Midtrans + Validation
// ======================================================
import express from "express";
import { body, param } from "express-validator";
import paymentController from "../controllers/paymentController.js";
import validateRequest from "../middleware/validation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export default function paymentRoutes(io) {
  paymentController.io = io;
  const router = express.Router();
  const controller = paymentController;

  /* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */

  // Saat membuat pembayaran baru
  const createPaymentValidation = [
    body("doctorId")
      .notEmpty()
      .withMessage("Doctor ID is required")
      .isString()
      .withMessage("Doctor ID must be a string"),
    body("amount")
      .notEmpty()
      .withMessage("Amount is required")
      .isFloat({ min: 1000 })
      .withMessage("Amount must be at least 1000 (Rp)"),
  ];

  // Saat update status pembayaran (admin)
  const updateStatusValidation = [
    param("id").notEmpty().withMessage("Payment ID is required"),
    body("status")
      .notEmpty()
      .withMessage("Status is required")
      .isIn(["pending", "success", "failed"])
      .withMessage("Status must be one of: pending, success, failed"),
  ];

  /* -------------------------------------------
   💳 PAYMENT ROUTES
------------------------------------------- */

  // ✅ 1. Buat pembayaran baru (user → doctor)
  router.post(
    "/create",
    authMiddleware,
    createPaymentValidation,
    validateRequest,
    paymentController.createPayment,
  );

  // ✅ 2. Callback dari Midtrans (tidak perlu token JWT)
  router.post("/callback", paymentController.midtransCallback);

  // ✅ 3. Cek status pembayaran berdasarkan orderId
  router.get(
    "/status/:orderId",
    authMiddleware,
    param("orderId").notEmpty().withMessage("Order ID is required"),
    validateRequest,
    paymentController.checkPaymentStatus,
  );

  // ✅ 4. Ambil semua pembayaran milik user/doctor login
  router.get("/", authMiddleware, paymentController.getUserPayments);

  // ✅ 5. Ambil detail pembayaran by ID
  router.get(
    "/:id",
    authMiddleware,
    param("id").notEmpty().withMessage("Payment ID is required"),
    validateRequest,
    paymentController.getPaymentById,
  );

  // ✅ 6. Update status pembayaran (admin atau internal)
  router.put(
    "/:id",
    authMiddleware,
    updateStatusValidation,
    validateRequest,
    paymentController.updatePaymentStatus,
  );

  // ✅ 7. Hapus pembayaran (opsional / admin)
  router.delete(
    "/:id",
    authMiddleware,
    param("id").notEmpty().withMessage("Payment ID is required"),
    validateRequest,
    paymentController.deletePayment,
  );
  router.get(
    "/active/doctor",
    authMiddleware,
    paymentController.getActiveConsultations,
  );

  router.get(
    "/retry/:id",
    verifyToken,
    PaymentController.retryAppointmentPayment,
  );

  return router;
}
