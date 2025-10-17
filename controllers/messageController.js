// controllers/messageController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class MessageController {
  // ✅ Ambil semua pesan (opsional untuk admin / debugging)
  async getAllMessages(req, res) {
    try {
      const messages = await prisma.message.findMany({
        orderBy: { sentAt: "asc" },
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
          chat: { select: { id: true } },
        },
      });

      res.json({ success: true, data: messages });
    } catch (error) {
      console.error("❌ Error getAllMessages:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  }

  // ✅ Ambil pesan berdasarkan ID
  async getMessageById(req, res) {
    try {
      const { id } = req.params;
      const message = await prisma.message.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
        },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      res.json({ success: true, data: message });
    } catch (error) {
      console.error("❌ Error getMessageById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch message",
        error: error.message,
      });
    }
  }

  // ✅ Buat pesan baru (user atau dokter)
  async createMessage(req, res) {
    try {
      const { chatId, sender, content, userId, doctorId } = req.body;

      if (!chatId || !sender || !content) {
        return res.status(400).json({
          success: false,
          message: "chatId, sender, and content are required",
        });
      }

      const message = await prisma.message.create({
        data: {
          chatId,
          sender,
          content,
          userId: sender === "user" ? userId : null,
          doctorId: sender === "doctor" ? doctorId : null,
        },
      });

      // Update lastMessageId di Chat
      await prisma.chat.update({
        where: { id: chatId },
        data: { lastMessageId: message.id },
      });

      res.status(201).json({
        success: true,
        message: "Message created successfully",
        data: message,
      });
    } catch (error) {
      console.error("❌ Error createMessage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create message",
        error: error.message,
      });
    }
  }

  // ✅ Update pesan
  async updateMessage(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const existing = await prisma.message.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      const updated = await prisma.message.update({
        where: { id },
        data: { content },
      });

      res.json({
        success: true,
        message: "Message updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Error updateMessage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update message",
        error: error.message,
      });
    }
  }

  // ✅ Hapus pesan
  async deleteMessage(req, res) {
    try {
      const { id } = req.params;

      const existing = await prisma.message.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      await prisma.message.delete({ where: { id } });

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleteMessage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete message",
        error: error.message,
      });
    }
  }
  // ✅ Ambil semua pesan berdasarkan Chat ID
  async getMessagesByChatId(req, res) {
    try {
      const { chatId } = req.params;

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
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
          message: "Chat not found",
        });
      }

      res.json({
        success: true,
        data: chat.messages,
      });
    } catch (error) {
      console.error("❌ Error getMessagesByChatId:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages by chat ID",
        error: error.message,
      });
    }
  }
}

export default new MessageController();
