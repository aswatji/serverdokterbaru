// routes/chatRoutes.js
// ✅ Final version — Chat routes (without consultationId)

const express = require("express");
const { body } = require("express-validator");
const chatController = require("../controllers/chatController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const sendMessageValidation = [
  body("content")
    .notEmpty()
    .withMessage("Message content is required")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be between 1 and 1000 characters"),
];

/* -------------------------------------------
   💬 ROUTES
------------------------------------------- */

// ✅ Ambil semua chat user / doctor (home chat list)
router.get("/", authMiddleware, chatController.getAllChats);

// ✅ Ambil satu chat berdasarkan chatKey (unique ID per chat)
router.get("/:chatKey", authMiddleware, chatController.getChatByKey);

// ✅ Kirim pesan baru di dalam chat
router.post(
  "/:chatKey/send",
  authMiddleware,
  sendMessageValidation,
  validateRequest,
  chatController.sendMessage
);

router.post("/", authMiddleware, chatController.createChat);

module.exports = router;
