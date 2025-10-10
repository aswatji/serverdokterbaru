// routes/messageRoutes.js
// ✅ Final version — Message routes (Prisma-based, synced with chat system)

const express = require("express");
const { body } = require("express-validator");
const messageController = require("../controllers/messageController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createMessageValidation = [
  body("chatId").notEmpty().withMessage("Chat ID is required"),
  body("content")
    .notEmpty()
    .isString()
    .withMessage("Content is required and must be a string")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Content must be between 1–1000 characters"),
];

const updateMessageValidation = [
  body("content")
    .notEmpty()
    .withMessage("Content cannot be empty")
    .isString()
    .withMessage("Content must be a string"),
];

/* -------------------------------------------
   ✉️ MESSAGE ROUTES
------------------------------------------- */

// ✅ Ambil semua pesan (admin / debug)
router.get("/", authMiddleware, messageController.getAllMessages);

// ✅ Ambil semua pesan berdasarkan Chat ID
router.get("/:chatId", authMiddleware, messageController.getMessagesByChatId);

// ✅ Buat pesan baru (user / doctor)
router.post(
  "/",
  authMiddleware,
  createMessageValidation,
  validateRequest,
  messageController.createMessage
);

// ✅ Update pesan (opsional — biasanya tidak digunakan di chat)
router.put(
  "/:id",
  authMiddleware,
  updateMessageValidation,
  validateRequest,
  messageController.updateMessage
);

// ✅ Hapus pesan (opsional — untuk admin)
router.delete("/:id", authMiddleware, messageController.deleteMessage);

module.exports = router;
