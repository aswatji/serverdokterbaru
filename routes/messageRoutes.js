const express = require("express");
const { body } = require("express-validator");
const messageController = require("../controllers/messageController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createMessageValidation = [
  body("content").notEmpty().withMessage("Content is required"),
  body("chatId").isInt({ min: 1 }).withMessage("Valid chat ID is required"),
  body("userId").isInt({ min: 1 }).withMessage("Valid user ID is required"),
];

const updateMessageValidation = [
  body("content").notEmpty().withMessage("Content is required"),
];

// Routes
router.get("/", messageController.getAllMessages);
router.get("/:id", messageController.getMessageById);
router.post(
  "/",
  createMessageValidation,
  validateRequest,
  messageController.createMessage
);
router.put(
  "/:id",
  updateMessageValidation,
  validateRequest,
  messageController.updateMessage
);
router.delete("/:id", messageController.deleteMessage);

module.exports = router;
