const prisma = require('../config/database');

class PaymentController {
  // Get all payments
  async getAllPayments(req, res, next) {
    try {
      const { status } = req.query;
      
      const where = {};
      if (status) where.status = status;

      const payments = await prisma.payment.findMany({
        where,
        include: {
          consultation: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullname: true,
                  email: true
                }
              },
              doctor: {
                select: {
                  id: true,
                  name: true,
                  specialty: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payment by ID
  async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id: id },
        include: {
          consultation: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                  photo: true
                }
              },
              doctor: {
                select: {
                  id: true,
                  name: true,
                  specialty: true,
                  photo: true
                }
              }
            }
          }
        }
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new payment
  async createPayment(req, res, next) {
    try {
      const { amount, status = 'pending' } = req.body;

      const payment = await prisma.payment.create({
        data: {
          amount,
          status
        }
      });

      res.status(201).json({
        success: true,
        message: 'Payment created successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // Update payment status
  async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await prisma.payment.update({
        where: { id: id },
        data: { status },
        include: {
          consultation: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullname: true,
                  email: true
                }
              },
              doctor: {
                select: {
                  id: true,
                  name: true,
                  specialty: true
                }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete payment
  async deletePayment(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.payment.delete({
        where: { id: id }
      });

      res.json({
        success: true,
        message: 'Payment deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Midtrans webhook handler
  async handleMidtransWebhook(req, res, next) {
    try {
      const { order_id, transaction_status, fraud_status } = req.body;

      let paymentStatus = 'pending';
      
      if (transaction_status === 'capture') {
        if (fraud_status === 'challenge') {
          paymentStatus = 'pending';
        } else if (fraud_status === 'accept') {
          paymentStatus = 'success';
        }
      } else if (transaction_status === 'settlement') {
        paymentStatus = 'success';
      } else if (transaction_status === 'cancel' || 
                 transaction_status === 'deny' || 
                 transaction_status === 'expire') {
        paymentStatus = 'failed';
      } else if (transaction_status === 'pending') {
        paymentStatus = 'pending';
      }

      const payment = await prisma.payment.update({
        where: { id: order_id },
        data: { status: paymentStatus }
      });

      res.json({
        success: true,
        message: 'Webhook processed successfully',
        data: payment
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();