// routes/newsRoutes.js
// ✅ Final version — News routes (Prisma-based)

import express from "express";
import { body } from "express-validator";
import newsController from "../controllers/newsController.js";
import validateRequest from "../middleware/validation.js";

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
router.get("/clear-cache", newsController.clearCache);
// ✅ Ambil semua berita
router.get("/", newsController.getAll);

// ✅ Ambil berita berdasarkan ID
router.get("/:id", newsController.getById);

// ✅ Tambah berita baru
router.post("/", createNewsValidation, validateRequest, newsController.create);

// ✅ Update berita
router.put(
  "/:id",
  updateNewsValidation,
  validateRequest,
  newsController.update,
);

// ✅ Hapus berita
router.delete("/:id", newsController.delete);

export default router;
