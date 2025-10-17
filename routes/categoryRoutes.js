// routes/categoryRoutes.js
// ✅ Final version — Category routes (for News, Articles, etc.)

import express from "express";
import { body } from "express-validator";
import categoryController from "../controllers/categoryController.js";
import validateRequest from "../middleware/validation.js";

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createCategoryValidation = [
  body("name").notEmpty().withMessage("Category name is required"),
  body("items")
    .optional()
    .isString()
    .withMessage("Items must be a string (JSON or CSV format allowed)"),
];

const updateCategoryValidation = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Category name cannot be empty"),
  body("items")
    .optional()
    .isString()
    .withMessage("Items must be a string (JSON or CSV format allowed)"),
];

/* -------------------------------------------
   📦 ROUTES
------------------------------------------- */

// ✅ Ambil semua kategori
router.get("/", categoryController.getAll);

// ✅ Tambah kategori baru
router.post(
  "/",
  createCategoryValidation,
  validateRequest,
  categoryController.create
);

// ✅ Update kategori
router.put(
  "/:id",
  updateCategoryValidation,
  validateRequest,
  categoryController.update
);

// ✅ Hapus kategori
router.delete("/:id", categoryController.delete);

export default router;
