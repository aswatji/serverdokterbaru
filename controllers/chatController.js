// controllers/chatController.js
// ✅ Final version — Simple chat controller (without consultationId)

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ChatController {
  // ✅ Ambil semua chat milik user / doctor (home chat list)
  async getAllChats(req, res) {
    try {
      const { id, type } = req.user; // dari authMiddleware
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
          lastMessage: true,
        },
        orderBy: { updatedAt: "desc" },
      });

      res.json({ success: true, data: chats });
    } catch (error) {
      console.error("❌ Error getAllChats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chats",
        error: error.message,
      });
    }
  }

  // ✅ Tambahkan di chatController.js
  async createChat(req, res) {
    try {
      const { userId, doctorId, paymentId } = req.body;

      // Cek apakah chat sudah ada sebelumnya
      let existingChat = await prisma.chat.findFirst({
        where: { userId, doctorId },
      });

      if (existingChat) {
        return res.status(200).json({ success: true, data: existingChat });
      }

      const chat = await prisma.chat.create({
        data: {
          userId,
          doctorId,
          paymentId,
          chatKey: `${userId}-${doctorId}-${Date.now()}`, // bisa juga pakai uuid
        },
        include: {
          user: true,
          doctor: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      console.error("❌ Error createChat:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create chat",
        error: error.message,
      });
    }
  }

  // ✅ Ambil 1 chat berdasarkan chatKey (unique ID)
  async getChatByKey(req, res) {
    try {
      const { chatKey } = req.params;

      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        include: {
          messages: {
            orderBy: { sentAt: "asc" },
            include: {
              user: { select: { id: true, fullname: true, photo: true } },
              doctor: { select: { id: true, fullname: true, photo: true } },
            },
          },
          user: true,
          doctor: true,
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      res.json({ success: true, data: chat });
    } catch (error) {
      console.error("❌ Error getChatByKey:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chat",
        error: error.message,
      });
    }
  }

  // ✅ Kirim pesan baru
  async sendMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { content } = req.body;
      const { id, type } = req.user;

      const chat = await prisma.chat.findUnique({ where: { chatKey } });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      const message = await prisma.message.create({
        data: {
          chatId: chat.id,
          sender: type,
          content,
          userId: type === "user" ? id : null,
          doctorId: type === "doctor" ? id : null,
        },
      });

      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("❌ Error sendMessage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
    }
  }
}

module.exports = new ChatController();
