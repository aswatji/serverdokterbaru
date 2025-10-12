// // routes/paymentRoutes.js
// // ✅ Final version — Payment routes (Prisma-based, chat auto-create)

// const express = require("express");
// const { body } = require("express-validator");
// const paymentController = require("../controllers/paymentController");
// const validateRequest = require("../middleware/validation");
// const { authMiddleware } = require("../middleware/authMiddleware");

// const router = express.Router();

// /* -------------------------------------------
//    🧾 VALIDATION RULES
// ------------------------------------------- */
// const createPaymentValidation = [
//   body("doctorId").notEmpty().withMessage("Doctor ID is required"),
//   body("amount")
//     .isFloat({ min: 1000 })
//     .withMessage("Amount must be greater than 0"),
// ];

// /* -------------------------------------------
//    💰 PAYMENT ROUTES
// ------------------------------------------- */

// // ✅ Buat pembayaran baru
// router.post(
//   "/create",
//   authMiddleware,
//   createPaymentValidation,
//   validateRequest,
//   paymentController.createPayment
// );

// // ✅ Callback dari Midtrans (tidak perlu auth)
// router.post("/callback", paymentController.midtransCallback);

// // ✅ Cek status pembayaran berdasarkan orderId
// router.get(
//   "/status/:orderId",
//   authMiddleware,
//   paymentController.checkPaymentStatus
// );

// // ✅ Ambil semua pembayaran user login
// router.get("/", authMiddleware, paymentController.getUserPayments);

// // ✅ (Opsional) Ambil detail pembayaran by ID (admin)
// router.get("/:id", authMiddleware, paymentController.getPaymentById);

// // ✅ (Opsional) Update status pembayaran (admin)
// router.put("/:id", authMiddleware, paymentController.updatePaymentStatus);

// // ✅ (Opsional) Hapus pembayaran (admin)
// router.delete("/:id", authMiddleware, paymentController.deletePayment);

// module.exports = router;

// routes/paymentRoutes.js
// ✅ FINAL VERSION — Payment routes (Prisma + Midtrans + Validation)

const express = require("express");
const { body, param } = require("express-validator");
const paymentController = require("../controllers/paymentController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */

// ✅ Saat membuat pembayaran baru
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

// ✅ Saat update status pembayaran (admin)
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
  paymentController.createPayment
);

// ✅ 2. Callback dari Midtrans (tidak perlu auth)
router.post("/callback", paymentController.midtransCallback);

// ✅ 3. Cek status pembayaran berdasarkan orderId
router.get(
  "/status/:orderId",
  authMiddleware,
  param("orderId").notEmpty().withMessage("Order ID is required"),
  validateRequest,
  paymentController.checkPaymentStatus
);

// ✅ 4. Ambil semua pembayaran user login
router.get("/", authMiddleware, paymentController.getUserPayments);

// ✅ 5. Ambil detail pembayaran by ID (user atau admin)
router.get(
  "/:id",
  authMiddleware,
  param("id").notEmpty().withMessage("Payment ID is required"),
  validateRequest,
  paymentController.getPaymentById
);

// ✅ 6. Update status pembayaran (admin)
router.put(
  "/:id",
  authMiddleware,
  updateStatusValidation,
  validateRequest,
  paymentController.updatePaymentStatus
);

// ✅ 7. Hapus pembayaran (admin)
router.delete(
  "/:id",
  authMiddleware,
  param("id").notEmpty().withMessage("Payment ID is required"),
  validateRequest,
  paymentController.deletePayment
);

module.exports = router;
