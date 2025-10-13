// controllers/paymentController.js
// ✅ Final version — works with Prisma schema and paymentRoutes.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const midtransClient = require("midtrans-client");

class PaymentController {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });
  }

  // ✅ 1. Buat pembayaran (user -> doctor)
  async createPayment(req, res) {
    try {
      const { doctorId, amount } = req.body;
      const { id: userId } = req.user;

      if (!doctorId || !amount)
        return res
          .status(400)
          .json({
            success: false,
            message: "doctorId and amount are required",
          });

      // Buat record pembayaran di DB
      const payment = await prisma.payment.create({
        data: {
          doctorId,
          userId,
          amount: parseFloat(amount),
          status: "pending",
        },
      });

      // Buat transaksi Midtrans
      const parameter = {
        transaction_details: {
          order_id: payment.id,
          gross_amount: payment.amount,
        },
        customer_details: {
          user_id: userId,
        },
      };

      const transaction = await this.snap.createTransaction(parameter);

      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: {
          paymentId: payment.id,
          redirect_url: transaction.redirect_url,
          token: transaction.token,
        },
      });
    } catch (error) {
      console.error("❌ createPayment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create payment",
        error: error.message,
      });
    }
  }

  // ✅ 2. Callback dari Midtrans
  async midtransCallback(req, res) {
    try {
      const payload = req.body;
      const orderId = payload.order_id;
      const transactionStatus = payload.transaction_status;

      let status = "pending";
      if (["capture", "settlement"].includes(transactionStatus))
        status = "success";
      if (["cancel", "deny", "expire"].includes(transactionStatus))
        status = "failed";

      const updatedPayment = await prisma.payment.update({
        where: { id: orderId },
        data: { status },
      });

      // Jika sukses, buat chat otomatis
      if (status === "success") {
        await prisma.chat.create({
          data: {
            chatKey: `CHAT-${Date.now()}`,
            userId: updatedPayment.userId,
            doctorId: updatedPayment.doctorId,
            paymentId: updatedPayment.id,
          },
        });
      }

      res.json({ success: true, message: "Callback processed", status });
    } catch (error) {
      console.error("❌ midtransCallback error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process callback",
        error: error.message,
      });
    }
  }

  // ✅ 3. Cek status pembayaran
  async checkPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id: orderId },
      });

      if (!payment)
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });

      res.json({ success: true, data: payment });
    } catch (error) {
      console.error("❌ checkPaymentStatus error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get payment status",
        error: error.message,
      });
    }
  }

  // ✅ 4. Ambil semua pembayaran user login
  async getUserPayments(req, res) {
    try {
      const { id, type } = req.user;
      const where = type === "doctor" ? { doctorId: id } : { userId: id };

      const payments = await prisma.payment.findMany({
        where,
        include: {
          doctor: { select: { id: true, fullname: true, category: true } },
          user: { select: { id: true, fullname: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: payments });
    } catch (error) {
      console.error("❌ getUserPayments error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user payments",
        error: error.message,
      });
    }
  }

  // ✅ 5. Ambil detail pembayaran
  async getPaymentById(req, res) {
    try {
      const { id } = req.params;
      const payment = await prisma.payment.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullname: true, email: true } },
          doctor: { select: { id: true, fullname: true, category: true } },
        },
      });

      if (!payment)
        return res
          .status(404)
          .json({ success: false, message: "Payment not found" });

      res.json({ success: true, data: payment });
    } catch (error) {
      console.error("❌ getPaymentById error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch payment",
        error: error.message,
      });
    }
  }

  // ✅ 6. Update status pembayaran
  async updatePaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updated = await prisma.payment.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: "Payment status updated",
        data: updated,
      });
    } catch (error) {
      console.error("❌ updatePaymentStatus error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update payment",
        error: error.message,
      });
    }
  }

  // ✅ 7. Hapus pembayaran
  async deletePayment(req, res) {
    try {
      const { id } = req.params;
      await prisma.payment.delete({ where: { id } });

      res.json({
        success: true,
        message: "Payment deleted successfully",
      });
    } catch (error) {
      console.error("❌ deletePayment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete payment",
        error: error.message,
      });
    }
  }
}

module.exports = new PaymentController();

// controllers/paymentController.js
// ✅ Versi stabil — aman dari error this.snap undefined

