const express = require("express");
const { body } = require("express-validator");
const chatController = require("../controllers/chatController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createChatValidation = [
  body("title").optional().isString().withMessage("Title must be a string"),
];

const updateChatValidation = [
  body("title").optional().isString().withMessage("Title must be a string"),
];

// Routes
router.get("/", chatController.getAllChats);
router.get("/:id", chatController.getChatById);
router.post(
  "/",
  createChatValidation,
  validateRequest,
  chatController.createChat
);
router.put(
  "/:id",
  updateChatValidation,
  validateRequest,
  chatController.updateChat
);
router.delete("/:id", chatController.deleteChat);

module.exports = router;
