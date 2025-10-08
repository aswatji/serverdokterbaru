const prisma = require("../config/database");
const midtransClient = require("midtrans-client");

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: process.env.NODE_ENV === "development",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
});

class PaymentController {
  // ✅ Create payment and initiate Midtrans transaction
  async createPayment(req, res, next) {
    try {
      const { doctorId, patientId, amount } = req.body;

      if (!doctorId || !patientId || !amount) {
        return res.status(400).json({
          success: false,
          message: "doctorId, patientId, and amount are required",
        });
      }

      // Validate doctor and patient
      const [doctor, patient] = await Promise.all([
        prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { id: true, fullname: true, category: true },
        }),
        prisma.user.findUnique({
          where: { id: patientId },
          select: { id: true, fullname: true, email: true },
        }),
      ]);

      if (!doctor)
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      if (!patient)
        return res
          .status(404)
          .json({ success: false, message: "Patient not found" });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          amount: parseFloat(amount),
          status: "pending",
        },
      });

      // Prepare Midtrans parameters
      const parameter = {
        transaction_details: {
          order_id: payment.id,
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

      const transaction = await snap.createTransaction(parameter);

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: {
          redirect_url: transaction.redirect_url,
          snap_token: transaction.token,
          order_id: payment.id,
        },
      });
    } catch (error) {
      console.error("Midtrans error:", error);
      next(error);
    }
  }

  // ✅ Midtrans webhook callback
  async midtransCallback(req, res, next) {
    try {
      const {
        order_id,
        transaction_status,
        fraud_status,
        custom_field1: doctorId,
        custom_field2: patientId,
      } = req.body;

      console.log("Midtrans callback received:", {
        order_id,
        transaction_status,
        fraud_status,
        doctorId,
        patientId,
      });

      const payment = await prisma.payment.findUnique({
        where: { id: order_id },
      });
      if (!payment)
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });

      let paymentStatus = payment.status;

      if (
        transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept")
      ) {
        paymentStatus = "success";

        await prisma.payment.update({
          where: { id: order_id },
          data: { status: "success" },
        });

        // Create Consultation + Chat
        const consultation = await prisma.consultation.create({
          data: {
            patientId,
            doctorId,
            paymentId: order_id,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            isActive: true,
          },
        });
        await prisma.chat.create({ data: { consultationId: consultation.id } });

        try {
          const { getIO } = require("../chatSocket");
          const io = getIO();
          io.emit("new_consultation", { consultation, doctorId });
        } catch (socketError) {
          console.error("Socket.IO notification error:", socketError.message);
        }
      } else if (
        transaction_status === "expire" ||
        transaction_status === "cancel" ||
        transaction_status === "deny"
      ) {
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

  // ✅ Get all payments
  async getAllPayments(req, res, next) {
    try {
      const { status } = req.query;
      const where = status ? { status } : {};

      const payments = await prisma.payment.findMany({
        where,
        include: {
          consultation: {
            include: {
              patient: { select: { id: true, fullname: true, email: true } },
              doctor: { select: { id: true, fullname: true, category: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Get payment by ID
  async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          consultation: {
            include: {
              patient: {
                select: { id: true, fullname: true, email: true, photo: true },
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

      if (!payment)
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });

      res.json({ success: true, data: payment });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Update payment status
  async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const payment = await prisma.payment.update({
        where: { id },
        data: { status },
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

  // ✅ Delete payment
  async deletePayment(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.payment.delete({ where: { id } });
      res.json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  // ✅ Get payment status from Midtrans (for frontend)
  async getStatusByOrderId(req, res) {
    try {
      const { orderId } = req.params;

      const core = new midtransClient.CoreApi({
        isProduction: process.env.NODE_ENV === "production",
        serverKey: process.env.MIDTRANS_SERVER_KEY,
        clientKey: process.env.MIDTRANS_CLIENT_KEY,
      });

      const statusResponse = await core.transaction.status(orderId);

      return res.status(200).json({
        success: true,
        data: {
          order_id: statusResponse.order_id,
          transaction_status: statusResponse.transaction_status,
          fraud_status: statusResponse.fraud_status,
          gross_amount: statusResponse.gross_amount,
          status_code: statusResponse.status_code,
          status_message: statusResponse.status_message,
        },
      });
    } catch (error) {
      console.error("Error getStatusByOrderId:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mendapatkan status pembayaran",
        error: error.message,
      });
    }
  }
}

module.exports = new PaymentController();
