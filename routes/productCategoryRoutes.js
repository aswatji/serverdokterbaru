import express from "express";
import productCategoryController from "../controllers/productCategoryController.js";

const router = express.Router();

// 🟢 Public Route (Untuk aplikasi mobile pasien / list obat)
router.get("/", productCategoryController.getAllCategories);

// 🔴 Admin Routes (Gunakan middleware admin Anda jika ada)
router.post("/", productCategoryController.createCategory);
router.put("/:id", productCategoryController.updateCategory);
router.delete("/:id", productCategoryController.deleteCategory);

export default router;
