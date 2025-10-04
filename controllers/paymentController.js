const prisma = require("../config/database");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === "production",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

class PaymentController {
  // Create payment and initiate Midtrans transaction
  async createPayment(req, res, next) {
    try {
      const { doctorId, patientId, amount } = req.body;

      // Validate required fields
      if (!doctorId || !patientId || !amount) {
        return res.status(400).json({
          success: false,
          message: "doctorId, patientId, and amount are required",
        });
      }

      // Validate doctor and patient exist
      const [doctor, patient] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          select: {
            id: true,
            fullname: true,
            category: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: patientId },
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        }),
      ]);

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: "Patient not found",
        });
      }

      // Create Payment record with status = "pending"
      const payment = await prisma.payment.create({
        data: {
          amount: parseFloat(amount),
          status: "pending",
        },
      });

      // Prepare Midtrans transaction parameters
      const parameter = {
        transaction_details: {
          order_id: payment.id, // Use Payment.id as order_id
          gross_amount: amount,
        },
        customer_details: {
          first_name: patient.fullname,
          email: patient.email,
          phone: "08123456789",
        },
        item_details: [
          {
            id: `consultation_${doctorId}`,
            price: amount,
            quantity: 1,
            name: `Konsultasi dengan ${doctor.fullname} - ${doctor.category}`,
          },
        ],
        custom_field1: doctorId,
        custom_field2: patientId,
        custom_field3: payment.id,
      };

      // Create transaction with Midtrans Snap
      const transaction = await snap.createTransaction(parameter);

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: {
          redirectUrl: transaction.redirect_url,
          token: transaction.token,
          orderId: payment.id,
          payment: payment,
        },
      });
    } catch (error) {
      console.error("Midtrans error:", error);
      next(error);
    }
  }

  // Midtrans webhook callback handler
  async midtransCallback(req, res, next) {
    try {
      const {
        order_id,
        transaction_status,
        fraud_status,
        custom_field1: doctorId,
        custom_field2: patientId,
        custom_field3: paymentId,
      } = req.body;

      console.log("Midtrans callback received:", {
        order_id,
        transaction_status,
        fraud_status,
        doctorId,
        patientId,
      });

      // Find Payment by order_id
      const payment = await prisma.payment.findUnique({
        where: { id: order_id },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      let paymentStatus = payment.status;

      // Handle transaction status from Midtrans
      if (
        transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept")
      ) {
        // Payment successful
        paymentStatus = "success";

        // Update Payment status
        await prisma.payment.update({
          where: { id: order_id },
          data: { status: "success" },
        });

        // Create Consultation
        const consultation = await prisma.consultation.create({
          data: {
            patientId: patientId || doctorId, // Use custom_field2 for patientId
            doctorId: doctorId || patientId, // Use custom_field1 for doctorId
            paymentId: order_id,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
            isActive: true,
          },
          include: {
            patient: {
              select: {
                id: true,
                fullname: true,
                photo: true,
              },
            },
            doctor: {
              select: {
                id: true,
                fullname: true,
                category: true,
                photo: true,
              },
            },
          },
        });

        // Create Chat linked to Consultation
        await prisma.chat.create({
          data: {
            consultationId: consultation.id,
          },
        });

        console.log("Consultation and chat created:", consultation.id);

        // Notify doctor via Socket.IO about new consultation
        if (global.socketServer) {
          global.socketServer.notifyDoctorNewConsultation(
            consultation.doctorId,
            consultation
          );
        }
      } else if (
        transaction_status === "expire" ||
        transaction_status === "cancel" ||
        transaction_status === "deny"
      ) {
        // Payment failed
        paymentStatus = "failed";

        await prisma.payment.update({
          where: { id: order_id },
          data: { status: "failed" },
        });
      } else if (transaction_status === "pending") {
        paymentStatus = "pending";
      }

      res.status(200).json({
        success: true,
        message: "Callback processed successfully",
        data: {
          orderId: order_id,
          status: paymentStatus,
          transactionStatus: transaction_status,
        },
      });
    } catch (error) {
      console.error("Midtrans callback error:", error);
      next(error);
    }
  }

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
                  email: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: payments,
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
                  photo: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                  photo: true,
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new payment
  async createPayment(req, res, next) {
    try {
      const { amount, status = "pending" } = req.body;

      const payment = await prisma.payment.create({
        data: {
          amount,
          status,
        },
      });

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: payment,
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
                  email: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Payment status updated successfully",
        data: payment,
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
        where: { id: id },
      });

      res.json({
        success: true,
        message: "Payment deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Legacy webhook handler (keeping for compatibility)
  async handleMidtransWebhook(req, res, next) {
    try {
      // Redirect to the new callback handler
      return this.midtransCallback(req, res, next);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
