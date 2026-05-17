import express from "express";
import PharmacyController from "../controllers/PharmacyController.js";
// Import middleware autentikasi yang Anda gunakan
// import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua rute di bawah ini wajib login
// router.use(verifyToken);

// 1. Membuat pesanan obat baru & mendapatkan token Midtrans
router.post("/orders", PharmacyController.createMedicineOrder);

// 2. Mengambil semua riwayat pesanan obat milik user yang sedang login
// Letakkan route ini SEBELUM "/orders/:id" agar tidak dianggap sebagai ID pesanan
router.get("/orders/my-orders", PharmacyController.getUserOrders);

// 3. Mengambil detail pesanan obat spesifik (berdasarkan ID order)
router.get("/orders/:id", PharmacyController.getOrderById);

// 4. Mengambil ulang sesi pembayaran Midtrans
router.get(
  "/orders/:id/retry-payment",
  PharmacyController.retryMedicinePayment,
);

export default router;
