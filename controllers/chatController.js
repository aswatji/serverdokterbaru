const prisma = require("../config/database");

class ChatController {
  // Get all chats
  async getAllChats(req, res, next) {
    try {
      const chats = await prisma.chat.findMany({
        include: {
          _count: {
            select: { messages: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: chats,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get chat by ID
  async getChatById(req, res, next) {
    try {
      const { id } = req.params;
      const chat = await prisma.chat.findUnique({
        where: { id: parseInt(id) },
        include: {
          messages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
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
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new chat
  async createChat(req, res, next) {
    try {
      const { title } = req.body;

      const chat = await prisma.chat.create({
        data: {
          title: title || null,
        },
      });

      res.status(201).json({
        success: true,
        message: "Chat created successfully",
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update chat
  async updateChat(req, res, next) {
    try {
      const { id } = req.params;
      const { title } = req.body;

      const chat = await prisma.chat.update({
        where: { id: parseInt(id) },
        data: { title },
      });

      res.json({
        success: true,
        message: "Chat updated successfully",
        data: chat,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete chat
  async deleteChat(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.chat.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: "Chat deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
