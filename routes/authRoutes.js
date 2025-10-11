// routes/authRoutes.js
const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullname").notEmpty().withMessage("Full name is required").trim(),
];

const doctorRegisterValidation = [
  body("fullname").notEmpty().withMessage("Full name is required"),
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("category").notEmpty().withMessage("Category is required"),
  body("university").optional().isString(),
  body("strNumber").notEmpty().withMessage("STR number is required"),
  body("gender")
    .isIn(["MALE", "FEMALE"])
    .withMessage("Gender must be MALE or FEMALE"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  body("role")
    .isIn(["user", "doctor"])
    .withMessage("Role must be 'user' or 'doctor'"),
];

// ✅ Routes
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.registerUser
);
router.post(
  "/doctor/register",
  doctorRegisterValidation,
  validateRequest,
  authController.registerDoctor
);
router.post("/login", loginValidation, validateRequest, authController.login);
router.get("/profile", authController.getProfile);

module.exports = router;
