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

      // Tentukan pengirim (user atau doctor)
      const messageData = {
        chatId: chat.id,
        sender,
        content,
      };

      if (sender === "user") {
        messageData.userId = user?.id || null;
      } else if (sender === "doctor") {
        messageData.doctorId = user?.id || null;
      }

      // Simpan pesan ke database
      const message = await prisma.message.create({
        data: messageData,
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
        },
      });

      // Emit ke Socket.IO (jika kamu sudah setup io di server)
      if (req.io) {
        req.io.to(chat.id).emit("new_message", message);
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

  // ✅ 3. Ambil semua chat (misal daftar konsultasi user)
  async getAllChats(req, res) {
    try {
      const chats = await prisma.chat.findMany({
        include: {
          consultation: {
            include: {
              doctor: { select: { id: true, fullname: true, category: true, photo: true } },
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
}

module.exports = new ChatController();
