const express = require('express');
const { body } = require('express-validator');
const newsController = require('../controllers/newsController');
const validateRequest = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createNewsValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required')
];

const updateNewsValidation = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().notEmpty().withMessage('Content cannot be empty')
];

// Routes
router.get('/', newsController.getAllNews);
router.get('/:id', newsController.getNewsById);
router.post('/', createNewsValidation, validateRequest, newsController.createNews);
router.put('/:id', updateNewsValidation, validateRequest, newsController.updateNews);
router.delete('/:id', newsController.deleteNews);

module.exports = router;