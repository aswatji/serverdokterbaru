// routes/categoryRoutes.js
// ✅ Final version — Category routes (for News, Articles, etc.)

const express = require("express");
const { body } = require("express-validator");
const categoryController = require("../controllers/categoryController");
const validateRequest = require("../middleware/validation");

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
  body("name").optional().notEmpty().withMessage("Category name cannot be empty"),
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

module.exports = router;
