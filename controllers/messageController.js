const prisma = require("../config/database");

class MessageController {
  // Get all messages
  async getAllMessages(req, res, next) {
    try {
      const { chatId, userId, doctorId } = req.query;

      const where = {};
      if (chatId) where.chatId = chatId;
      if (userId) where.userId = userId;
      if (doctorId) where.doctorId = doctorId;

      const messages = await prisma.message.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullname: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          chat: {
            select: {
              id: true,
              consultation: {
                select: {
                  id: true,
                  patient: {
                    select: {
                      fullname: true,
                    },
                  },
                  doctor: {
                    select: {
                      fullname: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          sentAt: "desc",
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
        where: { id: id },
        include: {
          user: {
            select: {
              id: true,
              fullname: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          chat: {
            select: {
              id: true,
              consultation: {
                select: {
                  id: true,
                  patient: {
                    select: {
                      fullname: true,
                    },
                  },
                  doctor: {
                    select: {
                      fullname: true,
                      category: true,
                    },
                  },
                },
              },
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
      const { content, chatId, sender, userId, doctorId } = req.body;

      // Validate sender and corresponding ID
      if (sender === "user" && !userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required when sender is user",
        });
      }

      if (sender === "doctor" && !doctorId) {
        return res.status(400).json({
          success: false,
          message: "doctorId is required when sender is doctor",
        });
      }

      const message = await prisma.message.create({
        data: {
          content,
          chatId,
          sender,
          userId: sender === "user" ? userId : null,
          doctorId: sender === "doctor" ? doctorId : null,
        },
        include: {
          user: {
            select: {
              id: true,
              fullname: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          chat: {
            select: {
              id: true,
              consultation: {
                select: {
                  id: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
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
        where: { id: id },
        data: { content },
        include: {
          user: {
            select: {
              id: true,
              fullname: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          chat: {
            select: {
              id: true,
              consultation: {
                select: {
                  id: true,
                },
              },
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
        where: { id: id },
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
