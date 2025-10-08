const express = require("express");
const { body } = require("express-validator");
const consultationController = require("../controllers/consultationController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

// Validation rules
const createConsultationValidation = [
  body("patientId").notEmpty().withMessage("Patient ID is required"),
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("paymentId")
    .optional()
    .isString()
    .withMessage("Payment ID must be a string"),
  body("duration")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Duration must be a positive integer"),
];

const updateConsultationValidation = [
  body("paymentId")
    .optional()
    .isString()
    .withMessage("Payment ID must be a string"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Expires at must be a valid date"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("Is active must be a boolean"),
];

// Routes
router.get("/", consultationController.getAllConsultations);
router.get("/:id", consultationController.getConsultationById);
router.post(
  "/",
  createConsultationValidation,
  validateRequest,
  consultationController.createConsultation
);
router.put(
  "/:id",
  updateConsultationValidation,
  validateRequest,
  consultationController.updateConsultation
);
router.put("/:id/end", consultationController.endConsultation);
router.delete("/:id", consultationController.deleteConsultation);

module.exports = router;
