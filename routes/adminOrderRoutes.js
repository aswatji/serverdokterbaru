import express from "express";
import adminOrderController from "../controllers/adminOrderController.js";
// import { verifyToken, verifyAdmin } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 Terapkan middleware untuk membatasi akses hanya untuk Admin
// router.use(verifyToken, verifyAdmin);

// 1. Mendapatkan statistik pendapatan dan pesanan
router.get("/stats", adminOrderController.getOrderStats);

// 2. Mendapatkan semua daftar pesanan masuk (Bisa di-filter via query ?status=success)
router.get("/", adminOrderController.getAllOrders);

// 3. Mendapatkan detail pesanan beserta alamat dan produk yang dibeli
router.get("/:id", adminOrderController.getOrderById);

// 4. Update status pesanan (Misal: admin sudah mengirim barang -> status jadi "shipped")
router.put("/:id/status", adminOrderController.updateOrderStatus);

export default router;
