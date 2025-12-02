import express from "express";
import multer from "multer";
import ProductController from "../controllers/productController.js";

const router = express.Router();

// Setup Multer (Simpan di RAM/Buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROUTES ---
// PERBAIKAN: Hapus "/products" di sini karena sudah didefinisikan di routes/index.js
// URL Akhir: /api/products/ (karena /api + /products + /)

// CREATE: POST /api/products
router.post("/", upload.single("image"), ProductController.createProduct);

// READ ALL: GET /api/products
router.get("/", ProductController.getAllProducts);

// READ ONE: GET /api/products/:id
router.get("/:id", ProductController.getProductById);

// UPDATE: PUT /api/products/:id
router.put("/:id", upload.single("image"), ProductController.updateProduct);

// DELETE: DELETE /api/products/:id
router.delete("/:id", ProductController.deleteProduct);

export default router;
