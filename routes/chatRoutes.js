const express = require("express");
const { body } = require("express-validator");
const chatController = require("../controllers/chatController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Validation rules
const sendMessageValidation = [
  body("consultationId")
    .notEmpty()
    .withMessage("Consultation ID is required")
    .isString()
    .withMessage("Consultation ID must be a string"),
  body("sender")
    .notEmpty()
    .withMessage("Sender is required")
    .isIn(["user", "doctor"])
    .withMessage("Sender must be 'user' or 'doctor'"),
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 1, max: 1000 })
    .withMessage("Content must be between 1 and 1000 characters"),
];

// Routes
// 5. POST /chat/send → chatController.sendMessage (auth required)
router.post(
  "/send",
  authMiddleware,
  sendMessageValidation,
  validateRequest,
  chatController.sendMessage
);

// 6. GET /chat/messages/:consultationId → chatController.getMessages (auth required)
router.get(
  "/messages/:consultationId",
  authMiddleware,
  chatController.getMessagesbyConsultation
);

// Additional routes
router.get("/", authMiddleware, chatController.getAllChats);
router.get(
  "/consultation/:consultationId/status",
  authMiddleware,
  chatController.getConsultationStatus
);
// List all chats (like WhatsApp home screen)
router.get("/list", chatController.listChats);

module.exports = router;
