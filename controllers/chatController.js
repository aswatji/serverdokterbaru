import prisma from "../config/database.js";
import { getIO, initChatSocket } from "../chatSocket.js";
import { uploadToMinio, deleteFromMinio } from "../utils/minioUpload.js";
import { bucketName } from "../config/minio.js";
import { sendPushNotification } from "../utils/notification.js";

class ChatController {
  // =======================================================
  // 🔹 GET ALL CHATS
  // =======================================================
  async getAllChats(req, res) {
    console.log("🧩 ChatController.getAllChats called by:", req.user);
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id, type } = req.user;

      const where =
        type === "doctor"
          ? { doctorId: id }
          : type === "user"
          ? { userId: id }
          : {};

      const chats = await prisma.chat.findMany({
        where,
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
          lastMessage: {
            select: {
              id: true,
              content: true,
              type: true,
              sentAt: true,
              sender: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const formatted = chats.map((chat) => {
        const partner = type === "doctor" ? chat.user : chat.doctor;
        return {
          id: chat.id,
          chatKey: chat.chatKey,
          displayName: partner.fullname,
          photo: partner.photo,
          partnerId: partner.id,
          lastMessage: chat.lastMessage?.content || "Belum ada pesan",
          lastMessageType: chat.lastMessage?.type || "text",
          lastMessageTime: chat.lastMessage?.sentAt || chat.updatedAt,
        };
      });

      res.status(200).json({ success: true, data: formatted });
    } catch (error) {
      console.error("❌ Error getAllChats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chats",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 🔹 CREATE (or GET EXISTING) CHAT
  // =======================================================
  async createChat(req, res) {
    try {
      const { userId, doctorId } = req.body;

      console.log("🔍 createChat called with:", { userId, doctorId });

      if (!userId || !doctorId) {
        return res.status(400).json({
          success: false,
          message: "userId dan doctorId wajib diisi",
        });
      }

      // Cari chat yang sudah ada
      let chat = await prisma.chat.findFirst({
        where: { userId, doctorId },
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
        },
      });

      if (chat) {
        console.log("✅ Existing chat found:", {
          id: chat.id,
          chatKey: chat.chatKey,
          userId: chat.userId,
          doctorId: chat.doctorId,
        });
      } else {
        // Generate chatKey yang unik
        const chatKey = `${userId}-${doctorId}`;
        console.log("🆕 Creating new chat with chatKey:", chatKey);

        chat = await prisma.chat.create({
          data: {
            userId,
            doctorId,
            chatKey,
          },
          include: {
            user: { select: { id: true, fullname: true, photo: true } },
            doctor: { select: { id: true, fullname: true, photo: true } },
          },
        });
      }

      const now = new Date();

      // 1. Query Payment untuk mencari waktu habis yang paling baru DAN masih aktif
      const latestActivePayment = await prisma.payment.findFirst({
        where: {
          userId: userId,
          doctorId: doctorId,
          status: { in: ["paid", "success"] },
          expiresAt: { gt: now }, // Harus lebih besar dari waktu sekarang (Aktif)
        },
        orderBy: {
          expiresAt: "desc", // Ambil yang paling lama waktu habisnya
        },
        select: { expiresAt: true },
      });

      // 2. Format data chat untuk frontend
      const chatDataToReturn = {
        ...chat, // Data chat yang sudah ada

        // Inject payment data yang sudah difilter
        payment: latestActivePayment
          ? { expiresAt: latestActivePayment.expiresAt.toISOString() }
          : null, // Jika tidak ada pembayaran aktif, kirim null
      };

      console.log(
        "✅ Returning chat data with latest expiry:",
        chatDataToReturn.payment?.expiresAt
      );

      res.status(200).json({ success: true, data: chatDataToReturn });
    } catch (error) {
      console.error("❌ Error createChat:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create chat",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 🔹 GET MESSAGES BY CHATKEY
  // =======================================================
  async getMessages(req, res) {
    try {
      const { chatKey } = req.params;

      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        include: {
          dates: {
            orderBy: { date: "asc" },
            include: {
              messages: {
                orderBy: { sentAt: "asc" },

                select: {
                  id: true,
                  sender: true,
                  content: true,
                  type: true,
                  sentAt: true,
                  fileUrl: true,
                  status: true,

                  replyTo: {
                    select: {
                      id: true,
                      content: true,
                      sender: true,
                      type: true,
                    },
                  },
                },
              },
            },
          },
          user: true,
          doctor: true,
        },
      });

      if (!chat)
        return res
          .status(404)
          .json({ success: false, message: "Chat tidak ditemukan" });

      const formatted = {
        chatKey: chat.chatKey,
        user: chat.user,
        doctor: chat.doctor,
        dates: chat.dates.map((d) => ({
          date: d.date,
          messages: d.messages,
        })),
      };

      res.status(200).json({ success: true, data: formatted });
    } catch (error) {
      console.error("❌ Error getMessages:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 💬 SEND TEXT MESSAGE — OPTIMIZED with upsert & parallel queries
  // =======================================================

  // =======================================================
  // 💬 SEND TEXT MESSAGE — FIXED (Unread Count + Notif Debug)
  // =======================================================
  async sendMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { content } = req.body;
      const { id: senderId, type: senderType } = req.user;

      if (!content?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Pesan tidak boleh kosong" });
      }

      // 1. Ambil data Chat, User, & Doctor
      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        include: {
          user: { select: { id: true, fullname: true, pushToken: true } },
          doctor: { select: { id: true, fullname: true, pushToken: true } },
        },
      });

      if (!chat)
        return res
          .status(404)
          .json({ success: false, message: "Chat tidak ditemukan" });

      // 2. Logic Simpan Pesan (Database)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const chatDate = await prisma.chatDate.upsert({
        where: { chatId_date: { chatId: chat.id, date: today } },
        update: {},
        create: { chatId: chat.id, date: today },
        select: { id: true },
      });

      const [message] = await Promise.all([
        prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: senderType,
            content,
            type: "text",
          },
          select: {
            id: true,
            sender: true,
            content: true,
            type: true,
            sentAt: true,
          },
        }),
        prisma.chat
          .update({
            where: { id: chat.id },
            data: { updatedAt: new Date(), lastMessageId: undefined },
          })
          .catch((err) => console.warn("⚠️ Update chat failed:", err.message)),
      ]);

      // Update lastMessageId terpisah agar aman
      await prisma.chat
        .update({
          where: { id: chat.id },
          data: { lastMessageId: message.id },
        })
        .catch((err) => console.warn(err));

      // ---------------------------------------------------------
      // 🔥 [NEW] UPDATE UNREAD COUNT (Solusi Error Prisma Tadi)
      // ---------------------------------------------------------
      // Kita jalankan tanpa 'await' (fire and forget) agar response cepat
      const targetRole = senderType === "user" ? "doctor" : "user";
      const targetId = senderType === "user" ? chat.doctorId : chat.userId;

      // Tentukan WHERE clause yang benar sesuai Schema Prisma Anda
      let unreadWhere = {};
      if (targetRole === "user") {
        unreadWhere = { chatId_userId: { chatId: chat.id, userId: targetId } };
      } else {
        unreadWhere = {
          chatId_doctorId: { chatId: chat.id, doctorId: targetId },
        };
      }

      prisma.chatUnread
        .upsert({
          where: unreadWhere, // ✅ Ini perbaikan kuncinya!
          update: { unreadCount: { increment: 1 } },
          create: {
            chatId: chat.id,
            userId: targetRole === "user" ? targetId : null,
            doctorId: targetRole === "doctor" ? targetId : null,
            unreadCount: 1,
          },
        })
        .catch((err) => console.error("⚠️ Gagal update unread:", err.message));
      // ---------------------------------------------------------

      // 3. BROADCAST SOCKET & PUSH NOTIFICATION
      setImmediate(async () => {
        // A. Socket.IO
        try {
          const io = getIO();
          const roomName = `chat:${chat.id}`;
          io.to(roomName).emit("new_message", {
            messageId: message.id,
            chatId: chat.id,
            sender: message.sender,
            content: message.content,
            type: message.type,
            sentAt: message.sentAt,
          });
        } catch (socketErr) {
          console.warn("Socket error", socketErr.message);
        }

        // B. Push Notification (Dengan Debugging Lengkap)
        try {
          const receiver = senderType === "user" ? chat.doctor : chat.user;
          const senderName =
            senderType === "user" ? chat.user.fullname : chat.doctor.fullname;

          console.log(`🔔 [DEBUG] Coba kirim notif ke: ${receiver?.fullname}`);

          if (receiver && receiver.pushToken) {
            let notifBody = "";
            if (messageType === "image") {
              notifBody = "📷 Mengirim foto";
            } else if (messageType === "pdf") {
              notifBody = "📄 Mengirim file";
            } else {
              notifBody =
                content.length > 50
                  ? content.substring(0, 50) + "..."
                  : content;
            }
            await sendPushNotification(
              receiver.pushToken,
              senderName || "Pesan Baru",
              notifBody,
              { screen: "chat", chatId: chat.id, chatKey: chat.chatKey }
            );
          } else {
            console.log("⚠️ [DEBUG] Skip notif: Token kosong/Receiver null");
          }
        } catch (notifErr) {
          console.error("❌ [DEBUG] Gagal kirim notif:", notifErr);
        }
      });

      return res
        .status(201)
        .json({ success: true, message: "Pesan terkirim", data: message });
    } catch (error) {
      console.error("❌ Error sendMessage:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // =======================================================
  // 💬 SEND FILE MESSAGE — NEW METHOD
  // =======================================================
  async sendFileMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { type: userType } = req.user;
      const file = req.file;

      if (!file)
        return res
          .status(400)
          .json({ success: false, message: "File tidak ditemukan" });

      // Validasi File (TETAP SAMA)
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.mimetype))
        return res
          .status(400)
          .json({ success: false, message: "Format salah" });
      if (file.size > 5 * 1024 * 1024)
        return res.status(400).json({ success: false, message: "Max 5MB" });

      // 🔥 2. UPDATE QUERY: Ambil data User & Doctor
      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        include: {
          user: { select: { id: true, fullname: true, pushToken: true } },
          doctor: { select: { id: true, fullname: true, pushToken: true } },
        },
      });

      if (!chat)
        return res
          .status(404)
          .json({ success: false, message: "Chat tidak ditemukan" });

      const messageType = file.mimetype.startsWith("image/") ? "image" : "pdf";
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `chat/${chat.id}/${timestamp}-${sanitizedName}`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [fileUrl, chatDate] = await Promise.all([
        uploadToMinio(file.buffer, fileName, file.mimetype),
        prisma.chatDate.upsert({
          where: { chatId_date: { chatId: chat.id, date: today } },
          update: {},
          create: { chatId: chat.id, date: today },
          select: { id: true },
        }),
      ]);

      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: userType,
          content: fileUrl,
          type: messageType,
        },
        select: {
          id: true,
          sender: true,
          content: true,
          type: true,
          sentAt: true,
        },
      });

      prisma.chat
        .update({
          where: { id: chat.id },
          data: { lastMessageId: message.id, updatedAt: new Date() },
        })
        .catch((err) => console.warn(err));

      // 🔥 3. BROADCAST SOCKET & PUSH NOTIFICATION
      setImmediate(async () => {
        // A. Socket
        try {
          const io = getIO();
          const roomName = `chat:${chat.id}`;
          io.to(roomName).emit("new_message", {
            messageId: message.id,
            chatId: chat.id,
            sender: message.sender,
            content: message.content,
            type: message.type,
            sentAt: message.sentAt,
            fileName: file.originalname,
            fileSize: file.size,
          });
          console.log(`📢 File message broadcast -> ${roomName}`);
        } catch (socketErr) {
          console.warn("Socket error", socketErr.message);
        }

        // B. Push Notification
        try {
          const receiver = userType === "user" ? chat.doctor : chat.user;
          const senderName =
            userType === "user" ? chat.user.fullname : chat.doctor.fullname;

          if (receiver && receiver.pushToken) {
            // Sesuaikan isi notif berdasarkan tipe file
            const notifBody =
              messageType === "image"
                ? "📷 Mengirim gambar"
                : "📄 Mengirim dokumen";

            await sendPushNotification(
              receiver.pushToken,
              senderName || "File Baru",
              notifBody,
              { chatId: chat.id, chatKey: chat.chatKey }
            );
          }
        } catch (notifErr) {
          console.error("❌ Gagal kirim notif file:", notifErr);
        }
      });

      return res.status(201).json({
        success: true,
        message: "File berhasil dikirim",
        data: { ...message, fileName: file.originalname, fileSize: file.size },
      });
    } catch (error) {
      console.error("❌ Error sendFileMessage:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 🗑️ DELETE MESSAGE (dengan cleanup file dari MinIO)

  async deleteMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { id: userId, type: userType } = req.user;

      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: {
          chatDate: {
            include: {
              chat: true,
            },
          },
        },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Pesan tidak ditemukan",
        });
      }

      // Validasi: hanya sender yang bisa delete
      const chat = message.chatDate.chat;
      const isSender =
        (userType === "user" && message.sender === "user") ||
        (userType === "doctor" && message.sender === "doctor");

      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak berhak menghapus pesan ini",
        });
      }

      // Jika message berisi file, hapus dari MinIO
      if (message.type === "image" || message.type === "pdf") {
        try {
          // Extract filename from URL
          const urlParts = message.content.split("/");
          const bucketIndex = urlParts.indexOf(bucketName);
          if (bucketIndex !== -1) {
            const fileName = urlParts.slice(bucketIndex + 1).join("/");
            await deleteFromMinio(fileName);
            console.log(`🗑️ File deleted from MinIO: ${fileName}`);
          }
        } catch (minioErr) {
          console.warn("⚠️ Failed to delete from MinIO:", minioErr.message);
        }
      }

      // Delete message from database
      await prisma.chatMessage.delete({
        where: { id: messageId },
      });

      // Update lastMessage jika ini adalah last message
      if (chat.lastMessageId === messageId) {
        const latestMessage = await prisma.chatMessage.findFirst({
          where: { chatDate: { chatId: chat.id } },
          orderBy: { sentAt: "desc" },
        });

        await prisma.chat.update({
          where: { id: chat.id },
          data: {
            lastMessageId: latestMessage?.id || null,
            updatedAt: new Date(),
          },
        });
      }

      // Broadcast delete event
      try {
        const io = getIO();
        const roomName = `chat:${chat.id}`;
        io.to(roomName).emit("message_deleted", {
          messageId: message.id,
          chatId: chat.id,
        });
        console.log(`📢 Delete broadcast -> ${roomName}`);
      } catch (socketErr) {
        console.warn("⚠️ Socket.IO not ready:", socketErr.message);
      }

      return res.json({
        success: true,
        message: "Pesan berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ Error deleteMessage:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus pesan",
        error: error.message,
      });
    }
  }

  async extendSession(req, res) {
    try {
      const { chatId, minutes } = req.body; // Contoh: minutes = 30

      if (!chatId || !minutes) {
        return res.status(400).json({
          success: false,
          message: "chatId dan minutes wajib diisi",
        });
      }

      // 1. Ambil data chat untuk tahu User & Doctor-nya
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { userId: true, doctorId: true },
      });

      if (!chat) {
        return res
          .status(404)
          .json({ success: false, message: "Chat tidak ditemukan" });
      }

      // 2. Cari Pembayaran Terakhir yang Sukses (Paid)
      // Kita update pembayaran terakhir, bukan membuat pembayaran baru
      const lastPayment = await prisma.payment.findFirst({
        where: {
          userId: chat.userId,
          doctorId: chat.doctorId,
          status: { in: ["paid", "success"] }, // Hanya yang sudah lunas
        },
        orderBy: {
          expiresAt: "desc", // Ambil yang paling akhir
        },
      });

      if (!lastPayment) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada riwayat pembayaran aktif untuk diperpanjang",
        });
      }

      // 3. Hitung Waktu Baru
      const currentExpiry = new Date(lastPayment.expiresAt);
      const now = new Date();

      // Logika: Jika sudah expired, tambah dari SEKARANG.
      // Jika belum expired, tambah dari SISA WAKTU yang ada.
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiresAt = new Date(baseTime.getTime() + minutes * 60 * 1000);

      // 4. Update Database (Tabel Payment)
      await prisma.payment.update({
        where: { id: lastPayment.id },
        data: { expiresAt: newExpiresAt },
      });

      console.log(
        `✅ Session extended for chat ${chatId}. New Expiry: ${newExpiresAt}`
      );

      // 5. 🔥 BROADCAST SOCKET (PENTING!)
      // Kita gunakan event 'payment_success' karena Frontend Anda (ChatTimerContext)
      // sudah mendengarkan event ini untuk me-reset timer.
      try {
        const io = getIO();
        if (io) {
          io.to(`chat:${chatId}`).emit("payment_success", {
            chatId: chatId,
            paymentId: lastPayment.id,
            status: "paid",
            expiresAt: newExpiresAt.toISOString(), // Kirim waktu baru ke Frontend
          });
          console.log(`📢 Timer update broadcasted to chat:${chatId}`);
        }
      } catch (socketErr) {
        console.warn(
          "⚠️ Socket not ready for timer update:",
          socketErr.message
        );
      }

      return res.status(200).json({
        success: true,
        message: `Waktu berhasil diperpanjang ${minutes} menit`,
        data: {
          expiresAt: newExpiresAt,
        },
      });
    } catch (error) {
      console.error("❌ Error extendSession:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperpanjang sesi",
        error: error.message,
      });
    }
  }
  // controllers/ChatController.js

  // =======================================================
  // ✏️ EDIT MESSAGE
  // =======================================================
  async editMessage(req, res) {
    try {
      const { messageId } = req.params;
      const { content } = req.body; // Isi pesan baru
      const { id: userId, type: userType } = req.user;

      if (!content || !content.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Konten tidak boleh kosong" });
      }

      // 1. Cari pesan lama
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: { chatDate: { include: { chat: true } } }, // Ambil info chat
      });

      if (!message)
        return res
          .status(404)
          .json({ success: false, message: "Pesan tidak ditemukan" });

      // 2. Validasi: Hanya pengirim asli yang boleh edit
      const isSender = message.sender === userType; // userType: 'user' atau 'doctor'
      if (!isSender) {
        return res.status(403).json({
          success: false,
          message: "Dilarang mengedit pesan orang lain",
        });
      }

      // 3. Update Database
      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content: content,
          // Opsional: Tambah kolom 'isEdited' di DB jika mau menampilkan label (diedit)
          // isEdited: true
        },
        include: {
          replyTo: { select: { id: true, content: true, sender: true } }, // Sertakan replyTo biar ga hilang
        },
      });

      // 4. Broadcast Socket (PENTING)
      try {
        const io = getIO();
        const roomName = `chat:${message.chatDate.chat.id}`;
        io.to(roomName).emit("message_updated", {
          chatId: message.chatDate.chat.id,
          message: updatedMessage,
        });
      } catch (err) {
        console.warn("Socket error:", err.message);
      }

      return res.json({ success: true, data: updatedMessage });
    } catch (error) {
      console.error("❌ Error editMessage:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default ChatController;
