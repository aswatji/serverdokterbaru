// authRoutes.js
// Authentication routes for user registration and login

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

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

const doctorRegisterValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullname").notEmpty().withMessage("Full name is required").trim(),
  body("category").notEmpty().withMessage("Category is required").trim(),
  body("university").notEmpty().withMessage("University is required").trim(),
  body("strNumber").notEmpty().withMessage("STR number is required").trim(),
  body("gender")
    .isIn(["MALE", "FEMALE"])
    .withMessage("Gender must be MALE or FEMALE"),
  body("alamatRumahSakit").optional().trim(),
];

// Routes
// 1. POST /auth/register → authController.register
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register
);

// 2. POST /auth/login → authController.login
router.post("/login", loginValidation, validateRequest, authController.login);

// 3. POST /auth/doctor/register → authController.doctorRegister
router.post(
  "/doctor/register",
  doctorRegisterValidation,
  validateRequest,
  authController.doctorRegister
);

// 4. POST /auth/doctor/login → authController.doctorLogin
router.post(
  "/doctor/login",
  loginValidation,
  validateRequest,
  authController.doctorLogin
);

module.exports = router;
