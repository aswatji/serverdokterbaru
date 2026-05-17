// routes/product.routes.js
import express from "express";
import multer from "multer";
import productController from "../controllers/productController.js";
// import { verifyAdmin } from "../middlewares/authMiddleware.js"; // Opsional jika butuh auth admin

const router = express.Router();

// Konfigurasi Multer Memory Storage (Karena file diupload langsung ke MinIO via buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit ukuran file 5MB
  },
});

// ✅ Routes untuk Public / User (Bisa diakses tanpa login)
router.get("/home", productController.getHomeData);
router.get("/", productController.getAllProducts); // Mendukung query ?categoryId=xxx
router.get("/:id", productController.getProductById);

// ✅ Routes untuk Admin (Upload, Update, Delete)
// Anda bisa menambahkan middleware autentikasi admin di sini
// Contoh: router.post("/", verifyAdmin, upload.single("image"), productController.createProduct);

router.post("/", upload.single("image"), productController.createProduct);
router.put("/:id", upload.single("image"), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;
