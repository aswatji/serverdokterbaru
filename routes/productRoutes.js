import express from "express";
import ProductController from "../controllers/productController.js";
import multer from "multer";

const router = express.Router();

// --- 1. SETUP MULTER ---
// Kita menggunakan memoryStorage() agar file tidak disimpan ke harddisk server dulu,
// tapi disimpan sementara di RAM (sebagai Buffer).
// Buffer inilah yang nanti dikirim oleh MinioService ke MinIO Cloud.
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Opsional: Membatasi ukuran file max 5MB
    }
});

// --- 2. DEFINISI ROUTE ---

// CREATE: Upload gambar + Data Produk
// 'image' adalah nama key/field yang harus dikirim dari Postman/Frontend
router.post("/products", upload.single("image"), ProductController.createProduct);

// READ: Ambil semua produk
router.get("/products", ProductController.getAllProducts);

// READ: Ambil satu produk by ID
router.get("/products/:id", ProductController.getProductById);

// UPDATE: Edit data + Opsi ganti gambar
// Kita pasang upload.single juga disini, karena user mungkin ingin mengganti foto produknya
router.put("/products/:id", upload.single("image"), ProductController.updateProduct);

// DELETE: Hapus produk
router.delete("/products/:id", ProductController.deleteProduct);

export default router;