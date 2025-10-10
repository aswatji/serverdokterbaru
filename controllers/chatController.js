const prisma = require("../config/database");

class ChatController {
  // ✅ 1. Ambil semua pesan berdasarkan consultationId (frontend pakai ini)
  async getMessages(req, res) {
    try {
      const { consultationId } = req.params;

      // Cari chat berdasarkan consultationId
      const chat = await prisma.chat.findUnique({
        where: { consultationId },
        include: {
          messages: {
            orderBy: { sentAt: "asc" },
            include: {
              user: { select: { id: true, fullname: true, photo: true } },
              doctor: { select: { id: true, fullname: true, photo: true } },
            },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this consultation",
        });
      }

      return res.json({
        success: true,
        data: { messages: chat.messages },
      });
    } catch (error) {
      console.error("❌ Error getMessages:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ✅ 2. Kirim pesan baru (user atau doctor)
  async sendMessage(req, res) {
    try {
      const { consultationId, sender, content } = req.body;
      const user = req.user; // dari authMiddleware

      if (!consultationId || !sender || !content) {
        return res.status(400).json({
          success: false,
          message: "consultationId, sender, and content are required",
        });
      }

      // Temukan chat berdasarkan consultationId
      const chat = await prisma.chat.findUnique({
        where: { consultationId },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this consultation",
        });
      }

      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          sender,
          content,
          userId: sender === "user" ? userId : null,
          doctorId: sender === "doctor" ? doctorId : null,
        },
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
        },
      });

      // Emit ke Socket.IO (jika kamu sudah setup io di server)
      if (req.io) {
        req.io
          .to(`consultation:${consultationId}`)
          .emit("new_message", message);
      }

      return res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("❌ Error sendMessage:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
  // ✅ Tambahkan di dalam class ChatController (kalau pakai class)
  async getConsultationStatus(req, res) {
    try {
      const { consultationId } = req.params;

      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          doctor: { select: { id: true, fullname: true, category: true } },
          patient: { select: { id: true, fullname: true } },
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Consultation not found",
        });
      }

      const now = new Date();
      const expiresAt = new Date(consultation.expiresAt);
      const remainingTime = Math.max(0, expiresAt - now);

      return res.json({
        success: true,
        data: {
          consultationId: consultation.id,
          isActive: consultation.isActive,
          timeRemainingMs: remainingTime,
          expiresAt,
          doctor: consultation.doctor,
          patient: consultation.patient,
        },
      });
    } catch (error) {
      console.error("❌ Error getConsultationStatus:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ✅ Tambahkan juga fungsi listChats (kalau belum ada)
  async listChats(req, res) {
    try {
      const chats = await prisma.chat.findMany({
        include: {
          consultation: {
            include: {
              doctor: {
                select: { fullname: true, category: true, photo: true },
              },
              patient: { select: { fullname: true, photo: true } },
            },
          },
          messages: {
            orderBy: { sentAt: "desc" },
            take: 1,
          },
        },
        orderBy: {
          consultation: { startedAt: "desc" },
        },
      });

      return res.json({
        success: true,
        data: chats,
      });
    } catch (error) {
      console.error("❌ Error listChats:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  // ✅ 3. Ambil semua chat (misal daftar konsultasi user)
  async getAllChats(req, res) {
    try {
      const chats = await prisma.chat.findMany({
        include: {
          consultation: {
            include: {
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                  photo: true,
                },
              },
              patient: { select: { id: true, fullname: true, photo: true } },
            },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { consultation: { startedAt: "desc" } },
      });

      return res.json({
        success: true,
        data: chats,
      });
    } catch (error) {
      console.error("❌ Error getAllChats:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
  async getMessagesByChatId(req, res) {
    try {
      const { chatId } = req.params; // ✅ Ganti dari consultationId ke chatId

      const chat = await prisma.chat.findUnique({
        where: { id: chatId }, // ✅ Cari berdasarkan ID chat
        include: {
          messages: {
            include: {
              user: { select: { id: true, fullname: true, photo: true } },
              doctor: { select: { id: true, fullname: true, photo: true } },
            },
            orderBy: { sentAt: "asc" },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this chatId",
        });
      }

      return res.json({ success: true, data: chat });
    } catch (error) {
      console.error("❌ Error getMessagesByChatId:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  }
}

module.exports = new ChatController();
