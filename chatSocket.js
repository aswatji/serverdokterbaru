const { Server } = require("socket.io");
const prisma = require("./config/database");

let io;
let doctorAvailabilityInterval;

/**
 * Initialize Chat Socket.IO server
 * @param {http.Server} server - HTTP server instance
 */
function initChatSocket(server) {
  // Setup Socket.IO server
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket.IO server initialized for real-time chat");

  // Handle client connections
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle joining chat room
    socket.on("join_chat", (chatId) => {
      const roomName = `chat:${chatId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);

      // Notify other users in the room about new participant
      socket.to(roomName).emit("user_joined", {
        socketId: socket.id,
        chatId: chatId,
        timestamp: new Date(),
      });
    });

    // Handle sending messages
    socket.on("send_message", async (payload) => {
      try {
        const { chatId, sender, content } = payload;

        // Validate payload
        if (!chatId || !sender || !content) {
          socket.emit("error", {
            message: "Missing required fields: chatId, sender, content",
          });
          return;
        }

        // Validate sender type
        if (!["user", "doctor"].includes(sender)) {
          socket.emit("error", {
            message: 'Sender must be "user" or "doctor"',
          });
          return;
        }

        const now = new Date();

        // Get chat with doctor details instead of consultation
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            doctor: {
              include: {
                schedules: true,
              },
            },
            user: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        });

        if (!chat) {
          socket.emit("error", {
            message: "Chat not found",
          });
          return;
        }

        // Validate chat is active
        if (!chat.isActive) {
          socket.emit("error", {
            message: "Chat is not active",
          });
          return;
        }

        // Validate chat has not expired (if expiresAt field exists)
        if (chat.expiresAt && now > chat.expiresAt) {
          socket.emit("error", {
            message: "Chat has expired",
          });
          return;
        }

        // Check doctor schedule matches current time
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes from midnight

        const isDoctorAvailable = chat.doctor.schedules.some((schedule) => {
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
        });

        if (!isDoctorAvailable && sender === "doctor") {
          socket.emit("error", {
            message: "Doctor is not available according to schedule",
          });
          return;
        }

        // Get or create today's chat date
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day

        let chatDate = await prisma.chatDate.findFirst({
          where: {
            chatId: chat.id,
            date: today,
          },
        });

        if (!chatDate) {
          chatDate = await prisma.chatDate.create({
            data: {
              chatId: chat.id,
              date: today,
            },
          });
        }

        // Prepare message data
        let messageData = {
          chatDateId: chatDate.id,
          sender,
          content,
          sentAt: now,
        };

        // Create message in Prisma
        const savedMessage = await prisma.chatMessage.create({
          data: messageData,
          include: {
            chatDate: {
              include: {
                chat: {
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
                },
              },
            },
          },
        });

        console.log(`Message saved: ${savedMessage.id} in chat: ${chatId}`);

        // Broadcast message to all clients in the chat room
        const roomName = `chat:${chatId}`;
        io.to(roomName).emit("new_message", {
          messageId: savedMessage.id,
          chatId: chatId,
          sender: savedMessage.sender,
          content: savedMessage.content,
          sentAt: savedMessage.sentAt,
          user: savedMessage.chatDate.chat.user,
          doctor: savedMessage.chatDate.chat.doctor,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error handling send_message:", error);
        socket.emit("error", {
          message: "Internal server error while sending message",
        });
      }
    });

    // Handle leaving chat room
    socket.on("leave_chat", (chatId) => {
      const roomName = `chat:${chatId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);

      // Notify other users in the room
      socket.to(roomName).emit("user_left", {
        socketId: socket.id,
        chatId: chatId,
        timestamp: new Date(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  // Start doctor availability notification interval
  startDoctorAvailabilityNotification();
}

/**
 * Start periodic doctor availability notifications
 */
function startDoctorAvailabilityNotification() {
  // Clear existing interval if any
  if (doctorAvailabilityInterval) {
    clearInterval(doctorAvailabilityInterval);
  }

  // Check every 120 seconds (optimized for production)
  doctorAvailabilityInterval = setInterval(async () => {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Get all active chats with doctor schedules (using Chat model instead of Consultation)
      const activeChats = await prisma.chat.findMany({
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              schedules: true,
            },
          },
        },
      });

      for (const chat of activeChats) {
        // Check if doctor is available according to current schedule
        const isDoctorAvailable = chat.doctor.schedules.some((schedule) => {
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
        });

        if (isDoctorAvailable) {
          const roomName = `chat:${chat.id}`;

          // Emit doctor_ready event to chat room
          io.to(roomName).emit("doctor_ready", {
            chatId: chat.id,
            doctorId: chat.doctorId,
            message: "Doctor is now available",
            doctorName: chat.doctor.fullname,
            timestamp: new Date(),
          });

          console.log(
            `Doctor availability notification sent for chat: ${chat.id}`
          );
        }
      }

      // Add periodic log for monitoring
      console.log(
        `Checking doctor availability for ${activeChats.length} active chats`
      );
    } catch (error) {
      console.error("Error in doctor availability notification:", error);
    }
  }, 120000); // Every 120 seconds (optimized)

  console.log(
    "Doctor availability notification interval started (120 seconds)"
  );
}

/**
 * Stop doctor availability notifications
 */
function stopDoctorAvailabilityNotification() {
  if (doctorAvailabilityInterval) {
    clearInterval(doctorAvailabilityInterval);
    doctorAvailabilityInterval = null;
    console.log("Doctor availability notification interval stopped");
  }
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initChatSocket() first.");
  }
  return io;
}

// Graceful shutdown
process.on("SIGINT", stopDoctorAvailabilityNotification);
process.on("SIGTERM", stopDoctorAvailabilityNotification);

module.exports = {
  initChatSocket,
  stopDoctorAvailabilityNotification,
  getIO,
};
