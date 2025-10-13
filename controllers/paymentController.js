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

    // Bind method supaya 'this' tetap mengarah ke class
    this.createPayment = this.createPayment.bind(this);
  }

  async createPayment(req, res) {
    try {
      const parameter = {
        transaction_details: {
          order_id: `ORDER-${Date.now()}`,
          gross_amount: req.body.amount || 50000,
        },
        credit_card: {
          secure: true,
        },
      };

      const transaction = await this.snap.createTransaction(parameter);

      res.status(200).json({
        token: transaction.token,
        redirect_url: transaction.redirect_url,
      });
    } catch (error) {
      console.error("createPayment error:", error);
      res.status(500).json({ message: error.message });
    }
  }

  // ✅ 2. Callback dari Midtrans
  // ✅ Fixed Midtrans callback with signature verification and logging
  async midtransCallback(req, res) {
    try {
      const payload = req.body;

      // Verifikasi signature key
      const crypto = require("crypto");
      const signatureKey = crypto
        .createHash("sha512")
        .update(
          payload.order_id +
            payload.status_code +
            payload.gross_amount +
            process.env.MIDTRANS_SERVER_KEY
        )
        .digest("hex");

      if (signatureKey !== payload.signature_key) {
        console.warn("🚫 Invalid signature, ignored");
        return res
          .status(403)
          .json({ success: false, message: "Invalid signature" });
      }

      // Mapping status
      const transactionStatus = payload.transaction_status;
      let status = "pending";
      if (["capture", "settlement"].includes(transactionStatus))
        status = "success";
      if (["cancel", "deny", "expire"].includes(transactionStatus))
        status = "failed";

      const updatedPayment = await prisma.payment.update({
        where: { id: payload.order_id },
        data: { status },
      });

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

      console.log(`✅ Payment ${payload.order_id} updated to ${status}`);
      res.status(200).json({ success: true, status });
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
