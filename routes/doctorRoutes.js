const express = require('express');
const { body } = require('express-validator');
const doctorController = require('../controllers/doctorController');
const validateRequest = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createDoctorValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('specialty').notEmpty().withMessage('Specialty is required'),
  body('bio').optional().isString().withMessage('Bio must be a string'),
  body('photo').optional().isURL().withMessage('Photo must be a valid URL')
];

const updateDoctorValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('specialty').optional().notEmpty().withMessage('Specialty cannot be empty'),
  body('bio').optional().isString().withMessage('Bio must be a string'),
  body('photo').optional().isURL().withMessage('Photo must be a valid URL')
];

const scheduleValidation = [
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Day of week must be 0-6'),
  body('startTime').isISO8601().withMessage('Start time must be a valid date'),
  body('endTime').isISO8601().withMessage('End time must be a valid date')
];

// Doctor routes
router.get('/', doctorController.getAllDoctors);
router.get('/:id', doctorController.getDoctorById);
router.post('/', createDoctorValidation, validateRequest, doctorController.createDoctor);
router.put('/:id', updateDoctorValidation, validateRequest, doctorController.updateDoctor);
router.delete('/:id', doctorController.deleteDoctor);

// Schedule routes
router.post('/:id/schedules', scheduleValidation, validateRequest, doctorController.addSchedule);
router.put('/schedules/:scheduleId', scheduleValidation, validateRequest, doctorController.updateSchedule);
router.delete('/schedules/:scheduleId', doctorController.deleteSchedule);

module.exports = router;