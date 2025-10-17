import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { getIO, initChatSocket } from "../chatSocket.js";
// 🔥 Import dari socket.js

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
  // 💬 SEND TEXT MESSAGE — integrated with socket.io
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

      const chat = await prisma.chat.findUnique({ where: { chatKey } });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat tidak ditemukan",
        });
      }

      // Cari / buat ChatDate (hari ini)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let chatDate = await prisma.chatDate.findFirst({
        where: { chatId: chat.id, date: today },
      });

      if (!chatDate) {
        chatDate = await prisma.chatDate.create({
          data: { chatId: chat.id, date: today },
        });
      }

      // Buat pesan baru
      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: type,
          content,
          type: "text",
        },
      });

      await prisma.chat.update({
        where: { id: chat.id },
        data: { lastMessageId: message.id, updatedAt: new Date() },
      });

      // 🔥 Broadcast ke room socket-mu: `chat:<chat.id>`
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
}

export default new ChatController();
