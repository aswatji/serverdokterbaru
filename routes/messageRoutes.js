const express = require("express");
const { body } = require("express-validator");
const messageController = require("../controllers/messageController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createMessageValidation = [
  body("content").notEmpty().withMessage("Content is required"),
  body("chatId").notEmpty().withMessage("Chat ID is required"),
  body("sender")
    .isIn(["user", "doctor"])
    .withMessage("Sender must be 'user' or 'doctor'"),
  body("userId").optional().isString().withMessage("User ID must be a string"),
  body("doctorId")
    .optional()
    .isString()
    .withMessage("Doctor ID must be a string"),
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
