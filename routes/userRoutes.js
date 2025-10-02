const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createUserValidation = [
  body("fullname").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("profession")
    .optional()
    .isString()
    .withMessage("Profession must be a string"),
  body("photo").optional().isString().withMessage("Photo must be a valid URL"),
];

const updateUserValidation = [
  body("fullname")
    .optional()
    .notEmpty()
    .withMessage("Full name cannot be empty"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("profession")
    .optional()
    .isString()
    .withMessage("Profession must be a string"),
  body("photo").optional().isString().withMessage("Photo must be a valid URL"),
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
