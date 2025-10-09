const express = require("express");
const { body } = require("express-validator");
const consultationController = require("../controllers/consultationController");
const validateRequest = require("../middleware/validation");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

/* ============================================================
   ✅ VALIDATION RULES
   ============================================================ */
const createConsultationValidation = [
  body("patientId")
    .notEmpty()
    .withMessage("Patient ID is required")
    .isString()
    .withMessage("Patient ID must be a string"),

  body("doctorId")
    .notEmpty()
    .withMessage("Doctor ID is required")
    .isString()
    .withMessage("Doctor ID must be a string"),

  body("paymentId")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isString()
    .withMessage("Payment ID must be a string"),

  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be a number in minutes"),
];

/* ============================================================
   ✅ ROUTES
   ============================================================ */

// 🟢 GET all consultations (optional query: ?patientId=xxx)
router.get("/", authMiddleware, consultationController.getAllConsultations);

// 🟢 GET single consultation by ID
router.get("/:id", authMiddleware, consultationController.getConsultationById);

// 🟢 CREATE consultation (with chat auto-create)
router.post(
  "/",
  authMiddleware,
  createConsultationValidation,
  validateRequest,
  consultationController.createConsultation
);

// 🟢 UPDATE consultation
router.put("/:id", authMiddleware, consultationController.updateConsultation);

// 🟢 END consultation (mark inactive)
router.put("/:id/end", authMiddleware, consultationController.endConsultation);

// 🟢 DELETE consultation
router.delete(
  "/:id",
  authMiddleware,
  consultationController.deleteConsultation
);

module.exports = router;
