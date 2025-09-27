const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createUserValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
];

const updateUserValidation = [
  body("name").optional().notEmpty().withMessage("Name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
];

// Routes
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post(
  "/",
  createUserValidation,
  validateRequest,
  userController.createUser
);
router.put(
  "/:id",
  updateUserValidation,
  validateRequest,
  userController.updateUser
);
router.delete("/:id", userController.deleteUser);

module.exports = router;
