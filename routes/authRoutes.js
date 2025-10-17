import express from "express";
import { body } from "express-validator";
import authController from "../controllers/authController.js";
import validateRequest from "../middleware/validation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================================
// 🧩 Validation Rules
// ======================================================

// ✅ Validation for user registration
const userRegisterValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullname").notEmpty().withMessage("Full name is required").trim(),
  body("profession").optional().isString(),
];

// ✅ Validation for doctor registration
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
  body("bio").optional().isString(),
  body("alamatRumahSakit").optional().isString(),
  body("photo").optional().isString(),
];

// ✅ Validation for login (without role)
const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// ======================================================
// 🚀 AUTH ROUTES
// ======================================================

// =================== USER ===================
router.post(
  "/user/register",
  userRegisterValidation,
  validateRequest,
  authController.registerUser
);

router.post(
  "/user/login",
  loginValidation,
  validateRequest,
  authController.loginUser
);

router.post("/user/logout", authController.logoutUser);

// =================== DOCTOR ===================
router.post(
  "/doctor/register",
  doctorRegisterValidation,
  validateRequest,
  authController.registerDoctor
);

router.post(
  "/doctor/login",
  loginValidation,
  validateRequest,
  authController.loginDoctor
);

router.post("/doctor/logout", authController.logoutDoctor);

// =================== PROFILE (Both User & Doctor) ===================
router.get("/profile", authMiddleware, authController.getProfile);

export default router;
