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

    // Handle joining consultation room
    socket.on("join_consultation", (consultationId) => {
      const roomName = `consultation:${consultationId}`;
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined room: ${roomName}`);

      // Notify other users in the room
      socket.to(roomName).emit("user_joined", {
        socketId: socket.id,
        consultationId: consultationId,
        timestamp: new Date(),
      });
    });

    // Handle sending messages
    socket.on("send_message", async (payload) => {
      try {
        const { consultationId, sender, content } = payload;

        // Validate payload
        if (!consultationId || !sender || !content) {
          socket.emit("error", {
            message: "Missing required fields: consultationId, sender, content",
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

        // Get consultation with doctor and schedule details
        const consultation = await prisma.consultation.findUnique({
          where: { id: consultationId },
          include: {
            doctor: {
              include: {
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
          socket.emit("error", {
            message: "Consultation not found",
          });
          return;
        }

        // Validate consultation is active
        if (!consultation.isActive) {
          socket.emit("error", {
            message: "Consultation is not active",
          });
          return;
        }

        // Validate consultation has not expired
        const now = new Date();
        if (now > consultation.expiresAt) {
          socket.emit("error", {
            message: "Consultation has expired",
          });
          return;
        }

        // Check doctor schedule matches current time
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes from midnight

        const isDoctorAvailable = consultation.doctor.schedules.some(
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

        if (!isDoctorAvailable && sender === "doctor") {
          socket.emit("error", {
            message: "Doctor is not available according to schedule",
          });
          return;
        }

        // Ensure chat exists
        if (!consultation.chat) {
          socket.emit("error", {
            message: "Chat not found for this consultation",
          });
          return;
        }

        // Prepare message data
        let messageData = {
          chatId: consultation.chat.id,
          sender,
          content,
          sentAt: now,
        };

        // Set userId or doctorId based on sender
        if (sender === "user") {
          messageData.userId = consultation.patientId;
        } else if (sender === "doctor") {
          messageData.doctorId = consultation.doctorId;
        }

        // Create message in Prisma
        const savedMessage = await prisma.message.create({
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

        console.log(
          `Message saved: ${savedMessage.id} in consultation: ${consultationId}`
        );

        // Broadcast message to all clients in the consultation room
        const roomName = `consultation:${consultationId}`;
        io.to(roomName).emit("new_message", {
          messageId: savedMessage.id,
          consultationId: consultationId,
          sender: savedMessage.sender,
          content: savedMessage.content,
          sentAt: savedMessage.sentAt,
          user: savedMessage.user,
          doctor: savedMessage.doctor,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error handling send_message:", error);
        socket.emit("error", {
          message: "Internal server error while sending message",
        });
      }
    });

    // Handle leaving consultation room
    socket.on("leave_consultation", (consultationId) => {
      const roomName = `consultation:${consultationId}`;
      socket.leave(roomName);
      console.log(`Socket ${socket.id} left room: ${roomName}`);

      // Notify other users in the room
      socket.to(roomName).emit("user_left", {
        socketId: socket.id,
        consultationId: consultationId,
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

  // Check every 120 seconds (reduced frequency)
  doctorAvailabilityInterval = setInterval(async () => {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Get only active consultations count first to avoid unnecessary processing
      const activeCount = await prisma.consultation.count({
        where: {
          isActive: true,
          expiresAt: {
            gt: now,
          },
        },
      });

      // Skip if no active consultations
      if (activeCount === 0) {
        return;
      }

      console.log(`Checking doctor availability for ${activeCount} active consultations`);

      // Get active consultations with minimal data
      const activeConsultations = await prisma.consultation.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
          doctorId: true,
          doctor: {
            select: {
              id: true,
              fullname: true,
              schedules: {
                select: {
                  dayOfWeek: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          },
        },
        take: 50, // Limit to prevent memory issues
      });

      for (const consultation of activeConsultations) {
        // Check if doctor is available according to current schedule
        const isDoctorAvailable = consultation.doctor.schedules.some(
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

        if (isDoctorAvailable) {
          const roomName = `consultation:${consultation.id}`;

          // Emit doctor_ready event to consultation room
          io.to(roomName).emit("doctor_ready", {
            consultationId: consultation.id,
            doctorId: consultation.doctorId,
            message: "Doctor is now available",
            doctorName: consultation.doctor.fullname,
            timestamp: new Date(),
          });

          console.log(
            `Doctor availability notification sent for consultation: ${consultation.id}`
          );
        }
      }
    } catch (error) {
      console.error("Error in doctor availability notification:", error);
      // Don't exit on error, just log and continue
    }
  }, 120000); // Every 120 seconds (reduced frequency)

  console.log("Doctor availability notification interval started (120 seconds)");
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
