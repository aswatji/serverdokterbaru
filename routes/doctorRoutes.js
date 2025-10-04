const express = require("express");
const { body } = require("express-validator");
const doctorController = require("../controllers/doctorController");
const validateRequest = require("../middleware/validation");
const {
  authMiddleware,
  requireDoctor,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Validation rules
const addScheduleValidation = [
  body("doctorId").notEmpty().withMessage("Doctor ID is required"),
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be 0-6 (0=Sunday, 6=Saturday)"),
  body("startTime").isISO8601().withMessage("Start time must be a valid date"),
  body("endTime").isISO8601().withMessage("End time must be a valid date"),
];

const updateScheduleValidation = [
  body("dayOfWeek")
    .optional()
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be 0-6"),
  body("startTime")
    .optional()
    .isISO8601()
    .withMessage("Start time must be a valid date"),
  body("endTime")
    .optional()
    .isISO8601()
    .withMessage("End time must be a valid date"),
];

// Doctor routes
router.get("/", doctorController.getAllDoctors);
router.get("/:doctorId", doctorController.getDoctorById);
router.post("/", doctorController.createDoctor);


// Schedule routes
// 7. POST /doctor/schedules → doctorController.addSchedule (auth + role doctor)
router.post(
  "/schedules",
  authMiddleware,
  requireDoctor,
  addScheduleValidation,
  validateRequest,
  doctorController.addSchedule
);

// 8. GET /doctor/schedules/:doctorId → doctorController.getSchedules
router.get("/schedules/:doctorId", doctorController.getSchedules);

// 9. PUT /doctor/schedules/:scheduleId → doctorController.updateSchedule
router.put(
  "/schedules/:scheduleId",
  authMiddleware,
  updateScheduleValidation,
  validateRequest,
  doctorController.updateSchedule
);

// 10. DELETE /doctor/schedules/:scheduleId → doctorController.deleteSchedule
router.delete(
  "/schedules/:scheduleId",
  authMiddleware,
  doctorController.deleteSchedule
);

module.exports = router;
