// chatController.js
// Implement chat send & get using Prisma with consultation validation.

const prisma = require("../config/database");

class ChatController {
  // 1. sendMessage(req, res) - Send message with validation
  async sendMessage(req, res, next) {
    try {
      const { consultationId, sender, content } = req.body;

      // Input validation: consultationId, sender ("user" | "doctor"), content
      if (!consultationId || !sender || !content) {
        return res.status(400).json({
          success: false,
          message: "consultationId, sender, and content are required",
        });
      }

      // Validate sender type
      if (!["user", "doctor"].includes(sender)) {
        return res.status(400).json({
          success: false,
          message: 'sender must be "user" or "doctor"',
        });
      }

      // Find Consultation with doctor schedules & chat
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              schedules: true,
            },
          },
          patient: {
            select: {
              id: true,
              fullname: true,
            },
          },
          chat: true,
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Consultation not found",
        });
      }

      // Validate consultation is active
      if (!consultation.isActive) {
        return res.status(403).json({
          success: false,
          error: "Consultation is not active",
        });
      }

      // Validate consultation hasn't expired
      const now = new Date();
      if (now > consultation.expiresAt) {
        // Auto-expire the consultation
        await prisma.consultation.update({
          where: { id: consultationId },
          data: { isActive: false },
        });

        return res.status(403).json({
          success: false,
          error: "Consultation expired",
        });
      }

      // Check if doctor is currently available based on schedule
      const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes from midnight

      const isWithinSchedule = consultation.doctor.schedules.some(
        (schedule) => {
          if (schedule.dayOfWeek !== currentDay) return false;

          const startTime = new Date(schedule.startTime);
          const endTime = new Date(schedule.endTime);

          const scheduleStartMinutes =
            startTime.getHours() * 60 + startTime.getMinutes();
          const scheduleEndMinutes =
            endTime.getHours() * 60 + endTime.getMinutes();

          return (
            currentTime >= scheduleStartMinutes &&
            currentTime <= scheduleEndMinutes
          );
        }
      );

      // If sender is doctor and not within schedule, warn but don't block
      if (sender === "doctor" && !isWithinSchedule) {
        console.warn(
          `Doctor ${consultation.doctor.fullname} sending message outside schedule`
        );
      }

      if (!consultation.chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this consultation",
        });
      }

      // Determine userId or doctorId based on sender
      let messageData = {
        chatId: consultation.chat.id,
        sender,
        content,
        sentAt: now,
      };

      if (sender === "user") {
        messageData.userId = consultation.patientId;
      } else if (sender === "doctor") {
        messageData.doctorId = consultation.doctorId;
      }

      // Create Message in Prisma
      const message = await prisma.message.create({
        data: messageData,
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
              photo: true,
            },
          },
          chat: {
            select: {
              id: true,
              consultationId: true,
            },
          },
        },
      });

      // Broadcast message via Socket.IO
      const { getIO } = require("../chatSocket");
      try {
        const io = getIO();
        const roomName = `consultation:${consultationId}`;
        io.to(roomName).emit("new_message", {
          ...message,
          consultation: {
            id: consultation.id,
            isActive: consultation.isActive,
            expiresAt: consultation.expiresAt,
            doctorAvailable: isWithinSchedule,
          },
        });
      } catch (socketError) {
        console.error("Socket.IO broadcast error:", socketError.message);
      }

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message,
        consultation: {
          id: consultation.id,
          isActive: consultation.isActive,
          expiresAt: consultation.expiresAt,
          doctorAvailable: isWithinSchedule,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. getMessages(req, res) - Get messages for consultation
  async getMessages(req, res, next) {
    try {
      // Input: consultationId (from URL params)
      const { consultationId } = req.params;

      if (!consultationId) {
        return res.status(400).json({
          success: false,
          message: "consultationId is required",
        });
      }

      // Find consultation + messages (order by sentAt asc)
      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          chat: {
            include: {
              messages: {
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
                      photo: true,
                    },
                  },
                },
                orderBy: {
                  sentAt: "asc", // Order by sentAt ascending
                },
              },
            },
          },
          patient: {
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
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Consultation not found",
        });
      }

      if (!consultation.chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found for this consultation",
        });
      }

      // Return array of messages
      res.json({
        success: true,
        data: {
          consultationId: consultation.id,
          messages: consultation.chat.messages,
          consultation: {
            id: consultation.id,
            startedAt: consultation.startedAt,
            expiresAt: consultation.expiresAt,
            isActive: consultation.isActive,
            patient: consultation.patient,
            doctor: consultation.doctor,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get consultation status and remaining time
  async getConsultationStatus(req, res, next) {
    try {
      const { consultationId } = req.params;

      const consultation = await prisma.consultation.findUnique({
        where: { id: consultationId },
        include: {
          doctor: {
            include: {
              schedules: true,
            },
            select: {
              id: true,
              fullname: true,
              category: true,
              schedules: true,
            },
          },
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Consultation not found",
        });
      }

      const now = new Date();
      const timeRemaining = consultation.expiresAt.getTime() - now.getTime();
      const isExpired = timeRemaining <= 0;

      // Check doctor availability
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const isWithinSchedule = consultation.doctor.schedules.some(
        (schedule) => {
          if (schedule.dayOfWeek !== currentDay) return false;

          const startTime = new Date(schedule.startTime);
          const endTime = new Date(schedule.endTime);

          const scheduleStartMinutes =
            startTime.getHours() * 60 + startTime.getMinutes();
          const scheduleEndMinutes =
            endTime.getHours() * 60 + endTime.getMinutes();

          return (
            currentTime >= scheduleStartMinutes &&
            currentTime <= scheduleEndMinutes
          );
        }
      );

      // Auto-expire if needed
      if (isExpired && consultation.isActive) {
        await prisma.consultation.update({
          where: { id: consultationId },
          data: { isActive: false },
        });
      }

      res.json({
        success: true,
        data: {
          consultationId: consultation.id,
          isActive: consultation.isActive && !isExpired,
          expiresAt: consultation.expiresAt,
          timeRemainingMs: Math.max(0, timeRemaining),
          timeRemainingMinutes: Math.max(0, Math.floor(timeRemaining / 60000)),
          doctorAvailable: isWithinSchedule,
          doctor: consultation.doctor,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  // ✅ NEW: List all chats like WhatsApp
  async listChats(req, res, next) {
    try {
      const { userId, doctorId } = req.query;

      if (!userId && !doctorId) {
        return res.status(400).json({
          success: false,
          message: "Please provide userId or doctorId",
        });
      }

      const consultations = await prisma.consultation.findMany({
        where: {
          OR: [
            userId ? { patientId: userId } : undefined,
            doctorId ? { doctorId: doctorId } : undefined,
          ].filter(Boolean),
        },
        include: {
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          patient: {
            select: { id: true, fullname: true, photo: true },
          },
          chat: {
            include: {
              messages: {
                orderBy: { sentAt: "desc" },
                take: 1, // hanya ambil pesan terakhir
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });

      const formatted = consultations.map((c) => {
        const lastMessage = c.chat?.messages?.[0];
        return {
          consultationId: c.id,
          doctor: c.doctor,
          patient: c.patient,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.sentAt || c.startedAt,
          isActive: c.isActive,
        };
      });

      res.json({
        success: true,
        message: "Chat list fetched successfully",
        data: formatted,
      });
    } catch (error) {
      console.error("Error listing chats:", error);
      next(error);
    }
  }

  // Get all chats (legacy)
  async getAllChats(req, res, next) {
    try {
      const chats = await prisma.chat.findMany({
        include: {
          _count: {
            select: { messages: true },
          },
          consultation: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullname: true,
                },
              },
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                },
              },
            },
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
}

module.exports = new ChatController();
