const express = require('express');
const { body } = require('express-validator');
const categoryController = require('../controllers/categoryController');
const validateRequest = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('items').optional().isString().withMessage('Items must be a string')
];

const updateCategoryValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('items').optional().isString().withMessage('Items must be a string')
];

// Routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', createCategoryValidation, validateRequest, categoryController.createCategory);
router.put('/:id', updateCategoryValidation, validateRequest, categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;