const express = require('express');
const { body } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const validateRequest = require('../middleware/validation');

const router = express.Router();

// Validation rules
const createPaymentValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('status').optional().isIn(['pending', 'success', 'failed']).withMessage('Invalid status')
];

const updatePaymentValidation = [
  body('status').isIn(['pending', 'success', 'failed']).withMessage('Invalid status')
];

// Routes
router.get('/', paymentController.getAllPayments);
router.get('/:id', paymentController.getPaymentById);
router.post('/', createPaymentValidation, validateRequest, paymentController.createPayment);
router.put('/:id/status', updatePaymentValidation, validateRequest, paymentController.updatePaymentStatus);
router.delete('/:id', paymentController.deletePayment);

// Webhook route for Midtrans
router.post('/webhook/midtrans', paymentController.handleMidtransWebhook);

module.exports = router;