// routes/newsRoutes.js
// ✅ Final version — News routes (Prisma-based)

const express = require("express");
const { body } = require("express-validator");
const newsController = require("../controllers/newsController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createNewsValidation = [
  body("title").notEmpty().withMessage("Title is required"),
  body("content").notEmpty().withMessage("Content is required"),
  body("image").optional().isString().withMessage("Image must be a string URL"),
];

const updateNewsValidation = [
  body("title").optional().notEmpty().withMessage("Title cannot be empty"),
  body("content").optional().notEmpty().withMessage("Content cannot be empty"),
  body("image").optional().isString().withMessage("Image must be a string URL"),
];

/* -------------------------------------------
   📰 ROUTES
------------------------------------------- */

// ✅ Ambil semua berita
router.get("/", newsController.getAll);

// ✅ Ambil berita berdasarkan ID
router.get("/:id", newsController.getById);

// ✅ Tambah berita baru
router.post(
  "/",
  createNewsValidation,
  validateRequest,
  newsController.create
);

// ✅ Update berita
router.put(
  "/:id",
  updateNewsValidation,
  validateRequest,
  newsController.update
);

// ✅ Hapus berita
router.delete("/:id", newsController.delete);

module.exports = router;
