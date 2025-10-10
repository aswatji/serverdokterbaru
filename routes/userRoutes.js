// routes/userRoutes.js
// ✅ Final version — User routes (Prisma-based)

const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createUserValidation = [
  body("fullname").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("profession")
    .optional()
    .isString()
    .withMessage("Profession must be a string"),
  body("photo")
    .optional()
    .isString()
    .withMessage("Photo must be a valid URL string"),
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
  body("photo")
    .optional()
    .isString()
    .withMessage("Photo must be a valid URL string"),
];

/* -------------------------------------------
   👤 USER ROUTES
------------------------------------------- */

// ✅ Ambil semua user
router.get("/", userController.getAll);

// ✅ Ambil detail user berdasarkan ID
router.get("/:id", userController.getById);

// ✅ Tambah user baru (opsional, biasanya lewat /auth/register)
router.post(
  "/",
  createUserValidation,
  validateRequest,
  userController.create
);

// ✅ Update data user
router.put(
  "/:id",
  updateUserValidation,
  validateRequest,
  userController.update
);

// ✅ Hapus user
router.delete("/:id", userController.delete);

module.exports = router;
