import prisma from "../config/database.js";
import { getIO, initChatSocket } from "../chatSocket.js";
import { uploadToMinio, deleteFromMinio } from "../utils/minioUpload.js";
import { bucketName } from "../config/minio.js";

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

      if (!userId || !doctorId) {
        return res.status(400).json({
          success: false,
          message: "userId dan doctorId wajib diisi",
        });
      }

      let chat = await prisma.chat.findFirst({
        where: { userId, doctorId },
        include: { user: true, doctor: true },
      });

      if (!chat) {
        const chatKey = `${userId}-${doctorId}`;
        chat = await prisma.chat.create({
          data: { userId, doctorId, chatKey },
          include: { user: true, doctor: true },
        });
      }

      res.status(200).json({ success: true, data: chat });
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
  async sendMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { content } = req.body;
      const { type } = req.user;

      if (!content?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Pesan tidak boleh kosong",
        });
      }

      // ✅ OPTIMASI 1: Ambil hanya field yang dibutuhkan
      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        select: { id: true },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat tidak ditemukan",
        });
      }

      // ✅ OPTIMASI 2: Gunakan UPSERT untuk chatDate (1 query instead of 2-3)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const chatDate = await prisma.chatDate.upsert({
        where: {
          chatId_date: {
            chatId: chat.id,
            date: today,
          },
        },
        update: {},
        create: {
          chatId: chat.id,
          date: today,
        },
        select: { id: true },
      });

      // ✅ OPTIMASI 3: Buat message & update chat PARALLEL (jalankan bersamaan)
      const [message] = await Promise.all([
        prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: type,
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
        // Update chat lastMessage (non-blocking)
        prisma.chat
          .update({
            where: { id: chat.id },
            data: { updatedAt: new Date() },
          })
          .catch((err) => console.warn("⚠️ Update chat failed:", err.message)),
      ]);

      // Update lastMessageId setelah message created
      prisma.chat
        .update({
          where: { id: chat.id },
          data: { lastMessageId: message.id },
        })
        .catch((err) =>
          console.warn("⚠️ Update lastMessageId failed:", err.message)
        );

      // ✅ OPTIMASI 4: Broadcast socket tanpa await (non-blocking)
      setImmediate(() => {
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
          console.log(`📢 Socket broadcast -> ${roomName}`);
        } catch (socketErr) {
          console.warn("⚠️ Socket.IO not ready:", socketErr.message);
        }
      });

      // ✅ Response langsung tanpa tunggu update selesai
      return res.status(201).json({
        success: true,
        message: "Pesan terkirim",
        data: message,
      });
    } catch (error) {
      console.error("❌ Error sendMessage:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengirim pesan",
        error: error.message,
      });
    }
  }
  async sendFileMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { type: userType } = req.user;
      const file = req.file; // dari multer middleware

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File tidak ditemukan",
        });
      }

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Tipe file tidak didukung. Hanya jpg, png, pdf",
        });
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "Ukuran file maksimal 5MB",
        });
      }

      // ✅ OPTIMASI: Ambil hanya field yang dibutuhkan
      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        select: { id: true },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat tidak ditemukan",
        });
      }

      // Tentukan tipe message (image atau file)
      const messageType = file.mimetype.startsWith("image/") ? "image" : "file";

      // Upload file ke MinIO & upsert chatDate PARALLEL
      const timestamp = Date.now();
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `chat/${chat.id}/${timestamp}-${sanitizedName}`;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ✅ OPTIMASI: Jalankan upload dan upsert bersamaan
      const [fileUrl, chatDate] = await Promise.all([
        uploadToMinio(file.buffer, fileName, file.mimetype),
        prisma.chatDate.upsert({
          where: {
            chatId_date: {
              chatId: chat.id,
              date: today,
            },
          },
          update: {},
          create: {
            chatId: chat.id,
            date: today,
          },
          select: { id: true },
        }),
      ]);

      // Buat message dengan file URL dari MinIO
      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: userType,
          content: fileUrl, // URL dari MinIO
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

      // ✅ OPTIMASI: Update lastMessage non-blocking
      prisma.chat
        .update({
          where: { id: chat.id },
          data: { lastMessageId: message.id, updatedAt: new Date() },
        })
        .catch((err) => console.warn("⚠️ Update chat failed:", err.message));

      // ✅ OPTIMASI: Broadcast socket non-blocking
      setImmediate(() => {
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
          console.warn("⚠️ Socket.IO not ready:", socketErr.message);
        }
      });

      return res.status(201).json({
        success: true,
        message: "File berhasil dikirim",
        data: {
          id: message.id,
          sender: message.sender,
          content: message.content,
          type: message.type,
          sentAt: message.sentAt,
          fileName: file.originalname,
          fileSize: file.size,
        },
      });
    } catch (error) {
      console.error("❌ Error sendFileMessage:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengirim file",
        error: error.message,
      });
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
      if (message.type === "image" || message.type === "file") {
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
}

export default ChatController;
