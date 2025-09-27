const prisma = require("../config/database");

class MessageController {
  // Get all messages
  async getAllMessages(req, res, next) {
    try {
      const { chatId, userId } = req.query;

      const where = {};
      if (chatId) where.chatId = parseInt(chatId);
      if (userId) where.userId = parseInt(userId);

      const messages = await prisma.message.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chat: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get message by ID
  async getMessageById(req, res, next) {
    try {
      const { id } = req.params;
      const message = await prisma.message.findUnique({
        where: { id: parseInt(id) },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chat: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (!message) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      res.json({
        success: true,
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new message
  async createMessage(req, res, next) {
    try {
      const { content, chatId, userId } = req.body;

      const message = await prisma.message.create({
        data: {
          content,
          chatId: parseInt(chatId),
          userId: parseInt(userId),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chat: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Message created successfully",
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update message
  async updateMessage(req, res, next) {
    try {
      const { id } = req.params;
      const { content } = req.body;

      const message = await prisma.message.update({
        where: { id: parseInt(id) },
        data: { content },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          chat: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Message updated successfully",
        data: message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete message
  async deleteMessage(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.message.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
