// // controllers/paymentController.js
// // ✅ Final version — works with Prisma schema and paymentRoutes.js

// import crypto from "crypto";
// import { PrismaClient } from "@prisma/client";
// import midtransClient from "midtrans-client";
// import { getIO } from "../chatSocket.js";

// const prisma = new PrismaClient();

// class PaymentController {
//   constructor() {
//     this.snap = new midtransClient.Snap({
//       isProduction: false,
//       serverKey: process.env.MIDTRANS_SERVER_KEY,
//       clientKey: process.env.MIDTRANS_CLIENT_KEY,
//     });
//     this.createPayment = this.createPayment.bind(this);
//   }

//   // ✅ 1. Buat pembayaran (user -> doctor)
//   async createPayment(req, res) {
//     try {
//       const { doctorId, amount } = req.body;
//       const { id: userId, fullname, email, phone } = req.user;

//       if (!doctorId || !amount) {
//         return res.status(400).json({
//           success: false,
//           message: "doctorId and amount are required",
//         });
//       }

//       // ✅ Simpan ke database (status pending)
//       const payment = await prisma.payment.create({
//         data: {
//           doctorId,
//           userId,
//           amount: parseFloat(amount),
//           status: "pending",
//         },
//       });

//       // ✅ Siapkan parameter untuk Midtrans
//       const parameter = {
//         transaction_details: {
//           order_id: payment.id, // wajib sama dengan DB ID
//           gross_amount: payment.amount,
//         },
//         // enabled_payments: ["qris"],
//         customer_details: {
//           first_name: fullname || "User",
//           email: email || "user@example.com",
//           phone: phone || "08123456789",
//         },
//       };

//       // ✅ Buat transaksi ke Midtrans
//       const transaction = await this.snap.createTransaction(parameter);

//       return res.status(201).json({
//         success: true,
//         message: "Payment created successfully",
//         data: {
//           paymentId: payment.id,
//           order_id: payment.id,
//           gross_amount: payment.amount,
//           redirect_url: transaction.redirect_url,
//           token: transaction.token,
//         },
//       });
//     } catch (error) {
//       console.error("❌ createPayment error:", error);
//       return res.status(500).json({
//         success: false,
//         message: "Failed to create payment",
//         error: error.message,
//       });
//     }
//   }

//   async midtransCallback(req, res) {
//     try {
//       const payload = req.body;
//       const signatureKey = crypto
//         .createHash("sha512")
//         .update(
//           payload.order_id +
//             payload.status_code +
//             payload.gross_amount +
//             process.env.MIDTRANS_SERVER_KEY,
//         )
//         .digest("hex");

//       if (signatureKey !== payload.signature_key) {
//         console.warn("🚫 Invalid signature, ignored");
//         return res
//           .status(403)
//           .json({ success: false, message: "Invalid signature" });
//       }

//       // 🔹 Tentukan status payment
//       const transactionStatus = payload.transaction_status;
//       let status = "pending";
//       if (["capture", "settlement"].includes(transactionStatus))
//         status = "success";
//       if (["cancel", "deny", "expire"].includes(transactionStatus))
//         status = "failed";

//       // 🔹 Update payment dengan paidAt dan expiresAt
//       // =============================
//       // ✅ UPDATE PAYMENT + HANDLE MULTI PAYMENT
//       // =============================

//       // Tentukan update payment
//       const updateData = { status };
//       let now = new Date();

//       if (status === "success") {
//         updateData.paidAt = now;
//         updateData.expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 menit
//       }

//       const updatedPayment = await prisma.payment.update({
//         where: { id: payload.order_id },
//         data: updateData,
//       });
//       const newExpiry = new Date(now.getTime() + 30 * 60 * 1000);

//       // =============================
//       // 🔍 CARI CHAT ATAU BUAT BARU
//       // =============================
//       let chat = await prisma.chat.findFirst({
//         where: {
//           userId: updatedPayment.userId,
//           doctorId: updatedPayment.doctorId,
//         },
//       });

//       if (!chat) {
//         chat = await prisma.chat.create({
//           data: {
//             chatKey: `CHAT-${Date.now()}`,
//             userId: updatedPayment.userId,
//             doctorId: updatedPayment.doctorId,
//             paymentId: updatedPayment.id,
//             // payment: { connect: { id: updatedPayment.id } },
//             isActive: true,
//           },
//         });
//       } else {
//         await prisma.chat.update({
//           where: { id: chat.id },
//           data: {
//             paymentId: updatedPayment.id,
//             // payment: { connect: { id: updatedPayment.id } },
//             isActive: true,
//             updatedAt: new Date(),
//             expiredAt: newExpiry, // ✅ TAMBAHKAN INI SAAT UPDATE
//           },
//         });
//       }

//       // =============================
//       // 🧠 AMBIL SEMUA PEMBAYARAN SUKSES
//       // DAN CARI expiresAt PALING BARU
//       // =============================
//       const allSuccessPayments = await prisma.payment.findMany({
//         where: {
//           userId: updatedPayment.userId,
//           doctorId: updatedPayment.doctorId,
//           status: "success",
//           expiresAt: { not: null },
//         },
//         orderBy: {
//           expiresAt: "desc",
//         },
//       });

//       // expiresAt paling akhir
//       const finalExpires =
//         allSuccessPayments.length > 0
//           ? allSuccessPayments[0].expiresAt
//           : updatedPayment.expiresAt;

//       // =============================
//       // 📢 EMIT KE ROOM CHAT
//       // supaya pasien & dokter tau expired terbaru
//       // =============================
//       try {
//         const io = getIO(); // ✅ Memanggil fungsi getIO() dengan aman
//         io.to(`chat:${chat.id}`).emit("payment_success", {
//           chatId: chat.id,
//           paymentId: updatedPayment.id,
//           paidAt: updatedPayment.paidAt,
//           expiresAt: finalExpires,
//         });
//         console.log(
//           `✅ Berhasil mengirim notifikasi socket untuk Chat: ${chat.id}`,
//         );
//       } catch (socketErr) {
//         console.warn(
//           "⚠️ Gagal mengirim socket emit, tapi pembayaran sukses di DB:",
//           socketErr.message,
//         );
//       }

//       // ✅ Wajib membalas 200 OK agar Midtrans berhenti melakukan spam retry
//       return res
//         .status(200)
//         .json({ success: true, message: "Callback processed successfully" });
//     } catch (error) {
//       console.error("❌ midtransCallback error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to process callback",
//         error: error.message,
//       });
//     }
//   }

//   async checkPaymentStatus(req, res) {
//     try {
//       const { orderId } = req.params;
//       const payment = await prisma.payment.findUnique({
//         where: { id: orderId },
//       });

//       if (!payment)
//         return res
//           .status(404)
//           .json({ success: false, message: "Payment not found" });

//       res.json({ success: true, data: payment });
//     } catch (error) {
//       console.error("❌ checkPaymentStatus error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to get payment status",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ 4. Ambil semua pembayaran user login
//   async getUserPayments(req, res) {
//     try {
//       const { id, type } = req.user;
//       const where = type === "doctor" ? { doctorId: id } : { userId: id };

//       const payments = await prisma.payment.findMany({
//         where,
//         include: {
//           doctor: { select: { id: true, fullname: true, category: true } },
//           user: { select: { id: true, fullname: true, email: true } },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       res.json({ success: true, data: payments });
//     } catch (error) {
//       console.error("❌ getUserPayments error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to get user payments",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ 5. Ambil detail pembayaran
//   async getPaymentById(req, res) {
//     try {
//       const { id } = req.params;
//       const payment = await prisma.payment.findUnique({
//         where: { id },
//         include: {
//           user: { select: { id: true, fullname: true, email: true } },
//           doctor: { select: { id: true, fullname: true, category: true } },
//         },
//       });

//       if (!payment)
//         return res
//           .status(404)
//           .json({ success: false, message: "Payment not found" });

//       res.json({ success: true, data: payment });
//     } catch (error) {
//       console.error("❌ getPaymentById error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch payment",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ 6. Update status pembayaran
//   async updatePaymentStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status } = req.body;

//       const updated = await prisma.payment.update({
//         where: { id },
//         data: { status },
//       });

//       res.json({
//         success: true,
//         message: "Payment status updated",
//         data: updated,
//       });
//     } catch (error) {
//       console.error("❌ updatePaymentStatus error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to update payment",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ 7. Hapus pembayaran
//   async deletePayment(req, res) {
//     try {
//       const { id } = req.params;
//       await prisma.payment.delete({ where: { id } });

//       res.json({
//         success: true,
//         message: "Payment deleted successfully",
//       });
//     } catch (error) {
//       console.error("❌ deletePayment error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to delete payment",
//         error: error.message,
//       });
//     }
//   }
//   async getActiveConsultations(req, res) {
//     try {
//       const { id: doctorId } = req.user;
//       const now = new Date();

//       const activeChats = await prisma.chat.findMany({
//         where: {
//           doctorId: doctorId,
//           // Filter chat yang payment-nya sukses DAN expiresAt > waktu sekarang
//           payment: {
//             is: {
//               status: "success",
//               expiresAt: {
//                 gt: now, // Filter: expiresAt LEBIH BESAR dari waktu sekarang (belum kadaluarsa)
//               },
//             },
//           },
//         },
//         include: {
//           user: { select: { id: true, fullname: true, photo: true } },
//           payment: { select: { expiresAt: true, paidAt: true } },
//         },
//         orderBy: {
//           updatedAt: "desc",
//         },
//       });

//       const formatted = activeChats.map((chat) => ({
//         chatId: chat.id,
//         userId: chat.userId,
//         userName: chat.user.fullname,
//         userPhoto: chat.user.photo,
//         expiresAt: chat.payment?.expiresAt, // Waktu habisnya chat
//         remaining: chat.payment?.expiresAt
//           ? chat.payment.expiresAt.getTime() - now.getTime()
//           : 0,
//       }));

//       res.status(200).json({ success: true, data: formatted });
//     } catch (error) {
//       console.error("❌ getActiveConsultations error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch active consultations",
//         error: error.message,
//       });
//     }
//   }
//   async getActiveConsultations(req, res) {
//     try {
//       const { id: doctorId } = req.user;
//       const now = new Date();

//       const activeChats = await prisma.chat.findMany({
//         where: {
//           doctorId: doctorId,
//           // Filter chat yang payment-nya sukses DAN expiresAt > waktu sekarang
//           payment: {
//             is: {
//               status: "success",
//               expiresAt: {
//                 gt: now, // Filter: expiresAt LEBIH BESAR dari waktu sekarang (belum kadaluarsa)
//               },
//             },
//           },
//         },
//         include: {
//           user: { select: { id: true, fullname: true, photo: true } },
//           payment: { select: { expiresAt: true, paidAt: true } },
//         },
//         orderBy: {
//           updatedAt: "desc",
//         },
//       });

//       const formatted = activeChats.map((chat) => ({
//         chatId: chat.id,
//         userId: chat.userId,
//         userName: chat.user.fullname,
//         userPhoto: chat.user.photo,
//         expiresAt: chat.payment?.expiresAt, // Waktu habisnya chat
//         remaining: chat.payment?.expiresAt
//           ? chat.payment.expiresAt.getTime() - now.getTime()
//           : 0,
//       }));

//       res.status(200).json({ success: true, data: formatted });
//     } catch (error) {
//       console.error("❌ getActiveConsultations error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch active consultations",
//         error: error.message,
//       });
//     }
//   }

//   // =================================================================
//   // ✅ 9. FITUR BARU: Retry Payment (Melanjutkan Pembayaran Pending)
//   // =================================================================
//   async retryAppointmentPayment(req, res) {
//     try {
//       // ID yang dikirim dari frontend (ini adalah id dari tabel Appointment)
//       const { id } = req.params;

//       // 1. Cari data appointment beserta data payment-nya
//       // Asumsi: Di schema.prisma, Appointment berelasi dengan Payment (bisa 1:1 atau 1:M)
//       const appointment = await prisma.appointment.findUnique({
//         where: { id: String(id) },
//         include: { payment: true }
//       });

//       if (!appointment) {
//         return res.status(404).json({
//           success: false,
//           message: 'Jadwal konsultasi tidak ditemukan'
//         });
//       }

//       // 2. Validasi apakah ada data pembayaran yang terkait
//       // Jika relasinya adalah array (one-to-many), ambil payment terakhir
//       const relatedPayment = Array.isArray(appointment.payment)
//         ? appointment.payment[appointment.payment.length - 1]
//         : appointment.payment;

//       if (!relatedPayment) {
//         return res.status(404).json({
//           success: false,
//           message: 'Data pembayaran belum dibuat untuk jadwal ini'
//         });
//       }

//       // 3. Validasi status (Tolak jika sudah dibayar)
//       if (appointment.status === 'UPCOMING' || relatedPayment.status === 'success') {
//         return res.status(400).json({
//           success: false,
//           message: 'Jadwal ini sudah lunas, tidak perlu dibayar lagi'
//         });
//       }

//       // 4. Ambil token yang tersimpan
//       // Pastikan di schema.prisma, model Payment memiliki field snapToken dan redirectUrl
//       const { snapToken, redirectUrl, id: orderId } = relatedPayment;

//       if (!snapToken) {
//         return res.status(400).json({
//           success: false,
//           message: 'Sesi token pembayaran belum tersimpan di sistem. Silakan batalkan dan buat jadwal baru.'
//         });
//       }

//       // 5. Kembalikan respons ke frontend
//       return res.status(200).json({
//         success: true,
//         data: {
//           token: snapToken,
//           redirect_url: redirectUrl,
//           order_id: orderId
//         }
//       });

//     } catch (error) {
//       console.error("❌ retryAppointmentPayment error:", error);
//       return res.status(500).json({
//         success: false,
//         message: 'Gagal mengambil sesi pembayaran',
//         error: error.message
//       });
//     }
//   }
// }

// export default new PaymentController();

// // controllers/paymentController.js
// // ✅ Versi stabil — aman dari error this.snap undefined

// controllers/paymentController.js
// ✅ Final version — works with Prisma schema and paymentRoutes.js

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import midtransClient from "midtrans-client";
import { getIO } from "../chatSocket.js";

const prisma = new PrismaClient();

class PaymentController {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    // Binding semua method agar konteks 'this' tidak hilang saat dipanggil dari router
    this.createPayment = this.createPayment.bind(this);
    this.midtransCallback = this.midtransCallback.bind(this);
    this.checkPaymentStatus = this.checkPaymentStatus.bind(this);
    this.getUserPayments = this.getUserPayments.bind(this);
    this.getPaymentById = this.getPaymentById.bind(this);
    this.updatePaymentStatus = this.updatePaymentStatus.bind(this);
    this.deletePayment = this.deletePayment.bind(this);
    this.getActiveConsultations = this.getActiveConsultations.bind(this);
    this.retryAppointmentPayment = this.retryAppointmentPayment.bind(this);
  }

  // ✅ 1. Buat pembayaran (user -> doctor)
  async createPayment(req, res) {
    try {
      // Ditambahkan support untuk menerima appointmentId jika dikirim dari frontend
      const { doctorId, amount, appointmentId } = req.body;
      const { id: userId, fullname, email, phone } = req.user;

      if (!doctorId || !amount) {
        return res.status(400).json({
          success: false,
          message: "doctorId and amount are required",
        });
      }

      // ✅ Simpan ke database (status pending)
      const paymentData = {
        doctorId,
        userId,
        amount: parseFloat(amount),
        status: "pending",
      };

      // Jika appointmentId dikirim dari frontend saat membuat pembayaran,
      // hubungkan payment ini dengan appointment tersebut.
      if (appointmentId) {
        paymentData.appointmentId = appointmentId;
      }

      const payment = await prisma.payment.create({
        data: paymentData,
      });

      // ✅ Siapkan parameter untuk Midtrans
      const parameter = {
        transaction_details: {
          order_id: payment.id, // wajib sama dengan DB ID
          gross_amount: payment.amount,
        },
        // enabled_payments: ["qris"],
        customer_details: {
          first_name: fullname || "User",
          email: email || "user@example.com",
          phone: phone || "08123456789",
        },
      };

      // ✅ Buat transaksi ke Midtrans
      const transaction = await this.snap.createTransaction(parameter);

      // Simpan snapToken dan redirectUrl ke database (Penting untuk fitur Retry)
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          snapToken: transaction.token,
          redirectUrl: transaction.redirect_url,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: {
          paymentId: payment.id,
          order_id: payment.id,
          gross_amount: payment.amount,
          redirect_url: transaction.redirect_url,
          token: transaction.token,
        },
      });
    } catch (error) {
      console.error("❌ createPayment error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create payment",
        error: error.message,
      });
    }
  }

  // ✅ 2. Callback Midtrans
  async midtransCallback(req, res) {
    try {
      const payload = req.body;
      const signatureKey = crypto
        .createHash("sha512")
        .update(
          payload.order_id +
            payload.status_code +
            payload.gross_amount +
            process.env.MIDTRANS_SERVER_KEY,
        )
        .digest("hex");

      if (signatureKey !== payload.signature_key) {
        console.warn("🚫 Invalid signature, ignored");
        return res
          .status(403)
          .json({ success: false, message: "Invalid signature" });
      }

      // 🔹 Tentukan status payment
      const transactionStatus = payload.transaction_status;
      let status = "pending";
      if (["capture", "settlement"].includes(transactionStatus))
        status = "success";
      if (["cancel", "deny", "expire"].includes(transactionStatus))
        status = "failed";

      // 🔹 Update payment dengan paidAt dan expiresAt
      // =============================
      // ✅ UPDATE PAYMENT + HANDLE MULTI PAYMENT
      // =============================

      // Tentukan update payment
      const updateData = { status };
      let now = new Date();

      if (status === "success") {
        updateData.paidAt = now;
        updateData.expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 menit
      }

      // Ambil data payment sebelum di-update untuk mengecek relasinya (misal dengan Appointment)
      const existingPayment = await prisma.payment.findUnique({
        where: { id: payload.order_id },
      });

      const updatedPayment = await prisma.payment.update({
        where: { id: payload.order_id },
        data: updateData,
      });

      // Update Appointment Status jika ada relasinya
      if (status === "success" && existingPayment?.appointmentId) {
        try {
          await prisma.appointment.update({
            where: { id: existingPayment.appointmentId },
            data: { status: "UPCOMING" }, // Sesuaikan dengan Enum status di Schema Anda
          });
        } catch (apptErr) {
          console.warn(
            "Gagal update status appointment dari callback:",
            apptErr.message,
          );
        }
      }

      const newExpiry = new Date(now.getTime() + 30 * 60 * 1000);

      // =============================
      // 🔍 CARI CHAT ATAU BUAT BARU
      // =============================
      let chat = await prisma.chat.findFirst({
        where: {
          userId: updatedPayment.userId,
          doctorId: updatedPayment.doctorId,
        },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            chatKey: `CHAT-${Date.now()}`,
            userId: updatedPayment.userId,
            doctorId: updatedPayment.doctorId,
            paymentId: updatedPayment.id,
            isActive: true,
          },
        });
      } else {
        await prisma.chat.update({
          where: { id: chat.id },
          data: {
            paymentId: updatedPayment.id,
            isActive: true,
            updatedAt: new Date(),
            expiredAt: newExpiry, // ✅ TAMBAHKAN INI SAAT UPDATE
          },
        });
      }

      // =============================
      // 🧠 AMBIL SEMUA PEMBAYARAN SUKSES
      // DAN CARI expiresAt PALING BARU
      // =============================
      const allSuccessPayments = await prisma.payment.findMany({
        where: {
          userId: updatedPayment.userId,
          doctorId: updatedPayment.doctorId,
          status: "success",
          expiresAt: { not: null },
        },
        orderBy: {
          expiresAt: "desc",
        },
      });

      // expiresAt paling akhir
      const finalExpires =
        allSuccessPayments.length > 0
          ? allSuccessPayments[0].expiresAt
          : updatedPayment.expiresAt;

      // =============================
      // 📢 EMIT KE ROOM CHAT
      // supaya pasien & dokter tau expired terbaru
      // =============================
      try {
        const io = getIO(); // ✅ Memanggil fungsi getIO() dengan aman
        io.to(`chat:${chat.id}`).emit("payment_success", {
          chatId: chat.id,
          paymentId: updatedPayment.id,
          paidAt: updatedPayment.paidAt,
          expiresAt: finalExpires,
        });
        console.log(
          `✅ Berhasil mengirim notifikasi socket untuk Chat: ${chat.id}`,
        );
      } catch (socketErr) {
        console.warn(
          "⚠️ Gagal mengirim socket emit, tapi pembayaran sukses di DB:",
          socketErr.message,
        );
      }

      // ✅ Wajib membalas 200 OK agar Midtrans berhenti melakukan spam retry
      return res
        .status(200)
        .json({ success: true, message: "Callback processed successfully" });
    } catch (error) {
      console.error("❌ midtransCallback error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process callback",
        error: error.message,
      });
    }
  }

  // ✅ 3. Check status pembayaran
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

  // ✅ 8. Ambil Konsultasi Aktif
  async getActiveConsultations(req, res) {
    try {
      const { id: doctorId } = req.user;
      const now = new Date();

      const activeChats = await prisma.chat.findMany({
        where: {
          doctorId: doctorId,
          // Filter chat yang payment-nya sukses DAN expiresAt > waktu sekarang
          payment: {
            is: {
              status: "success",
              expiresAt: {
                gt: now, // Filter: expiresAt LEBIH BESAR dari waktu sekarang (belum kadaluarsa)
              },
            },
          },
        },
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          payment: { select: { expiresAt: true, paidAt: true } },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const formatted = activeChats.map((chat) => ({
        chatId: chat.id,
        userId: chat.userId,
        userName: chat.user.fullname,
        userPhoto: chat.user.photo,
        expiresAt: chat.payment?.expiresAt, // Waktu habisnya chat
        remaining: chat.payment?.expiresAt
          ? chat.payment.expiresAt.getTime() - now.getTime()
          : 0,
      }));

      res.status(200).json({ success: true, data: formatted });
    } catch (error) {
      console.error("❌ getActiveConsultations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active consultations",
        error: error.message,
      });
    }
  }

  // =================================================================
  // ✅ 9. FITUR BARU: Retry Payment (Melanjutkan Pembayaran Pending)
  // =================================================================
  async retryAppointmentPayment(req, res) {
    try {
      const { id } = req.params;

      // 1. Cari data appointment beserta data payment-nya
      // ✅ Perhatikan: include menggunakan 'payments' (sesuai schema)
      const appointment = await prisma.appointment.findUnique({
        where: { id: String(id) },
        include: { payments: true },
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Jadwal konsultasi tidak ditemukan",
        });
      }

      // 2. Validasi apakah ada data pembayaran yang terkait
      // Karena schema mendefinisikan 'payments Payment[]', datanya pasti berupa array.
      // Ambil elemen terakhir (transaksi terbaru) jika user sempat mencoba beberapa kali.
      const relatedPayment =
        appointment.payments.length > 0
          ? appointment.payments[appointment.payments.length - 1]
          : null;

      if (!relatedPayment) {
        return res.status(404).json({
          success: false,
          message: "Data pembayaran belum dibuat untuk jadwal ini",
        });
      }

      // 3. Validasi status (Tolak jika sudah lunas atau sudah lewat)
      if (
        appointment.status === "UPCOMING" ||
        relatedPayment.status === "success"
      ) {
        return res.status(400).json({
          success: false,
          message: "Jadwal ini sudah lunas, tidak perlu dibayar lagi",
        });
      }

      // 4. Ambil token yang tersimpan di database
      const { snapToken, redirectUrl, id: orderId } = relatedPayment;

      if (!snapToken) {
        return res.status(400).json({
          success: false,
          message:
            "Sesi token pembayaran belum tersimpan di sistem. Silakan batalkan dan buat jadwal baru.",
        });
      }

      // 5. Kembalikan respons ke frontend
      return res.status(200).json({
        success: true,
        data: {
          token: snapToken,
          redirect_url: redirectUrl,
          order_id: orderId,
        },
      });
    } catch (error) {
      console.error("❌ retryAppointmentPayment error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil sesi pembayaran",
        error: error.message,
      });
    }
  }
}

export default new PaymentController();
