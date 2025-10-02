const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

class SocketServer {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"],
      },
    });

    this.connectedUsers = new Map(); // userId -> socketId
    this.connectedDoctors = new Map(); // doctorId -> socketId
    this.consultationRooms = new Map(); // consultationId -> Set of socketIds

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "your-secret-key"
        );
        socket.userId = decoded.id;
        socket.userType = decoded.type || "user"; // 'user' or 'doctor'

        next();
      } catch (error) {
        next(new Error("Invalid authentication token"));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`${socket.userType} connected: ${socket.userId}`);

      // Store socket connection
      if (socket.userType === "doctor") {
        this.connectedDoctors.set(socket.userId, socket.id);
      } else {
        this.connectedUsers.set(socket.userId, socket.id);
      }

      // Join consultation room
      socket.on("join_consultation", (consultationId) => {
        socket.join(`consultation_${consultationId}`);

        if (!this.consultationRooms.has(consultationId)) {
          this.consultationRooms.set(consultationId, new Set());
        }
        this.consultationRooms.get(consultationId).add(socket.id);

        console.log(
          `${socket.userType} ${socket.userId} joined consultation ${consultationId}`
        );

        // Notify others in the room about new participant
        socket.to(`consultation_${consultationId}`).emit("user_joined", {
          userId: socket.userId,
          userType: socket.userType,
          consultationId,
        });
      });

      // Leave consultation room
      socket.on("leave_consultation", (consultationId) => {
        socket.leave(`consultation_${consultationId}`);

        if (this.consultationRooms.has(consultationId)) {
          this.consultationRooms.get(consultationId).delete(socket.id);
          if (this.consultationRooms.get(consultationId).size === 0) {
            this.consultationRooms.delete(consultationId);
          }
        }

        console.log(
          `${socket.userType} ${socket.userId} left consultation ${consultationId}`
        );

        // Notify others in the room about user leaving
        socket.to(`consultation_${consultationId}`).emit("user_left", {
          userId: socket.userId,
          userType: socket.userType,
          consultationId,
        });
      });

      // Handle typing indicator
      socket.on("typing_start", (consultationId) => {
        socket.to(`consultation_${consultationId}`).emit("user_typing", {
          userId: socket.userId,
          userType: socket.userType,
          isTyping: true,
        });
      });

      socket.on("typing_stop", (consultationId) => {
        socket.to(`consultation_${consultationId}`).emit("user_typing", {
          userId: socket.userId,
          userType: socket.userType,
          isTyping: false,
        });
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`${socket.userType} disconnected: ${socket.userId}`);

        // Remove from connected users/doctors
        if (socket.userType === "doctor") {
          this.connectedDoctors.delete(socket.userId);
        } else {
          this.connectedUsers.delete(socket.userId);
        }

        // Clean up consultation rooms
        this.consultationRooms.forEach((socketsInRoom, consultationId) => {
          if (socketsInRoom.has(socket.id)) {
            socketsInRoom.delete(socket.id);
            if (socketsInRoom.size === 0) {
              this.consultationRooms.delete(consultationId);
            }

            // Notify others in consultation about disconnection
            socket.to(`consultation_${consultationId}`).emit("user_left", {
              userId: socket.userId,
              userType: socket.userType,
              consultationId,
            });
          }
        });
      });
    });
  }

  // Broadcast new message to consultation room
  broadcastMessage(consultationId, message) {
    this.io.to(`consultation_${consultationId}`).emit("new_message", message);
  }

  // Send consultation status update
  broadcastConsultationStatus(consultationId, status) {
    this.io
      .to(`consultation_${consultationId}`)
      .emit("consultation_status_update", {
        consultationId,
        ...status,
      });
  }

  // Notify doctor about new consultation
  notifyDoctorNewConsultation(doctorId, consultation) {
    const doctorSocketId = this.connectedDoctors.get(doctorId);
    if (doctorSocketId) {
      this.io.to(doctorSocketId).emit("new_consultation", consultation);
    }
  }

  // Notify user about consultation expiring soon
  notifyConsultationExpiringSoon(consultationId, minutesRemaining) {
    this.io.to(`consultation_${consultationId}`).emit("consultation_expiring", {
      consultationId,
      minutesRemaining,
      message: `Your consultation will expire in ${minutesRemaining} minutes`,
    });
  }

  // Get online status
  isUserOnline(userId, userType = "user") {
    if (userType === "doctor") {
      return this.connectedDoctors.has(userId);
    }
    return this.connectedUsers.has(userId);
  }

  // Get consultation room participants
  getConsultationParticipants(consultationId) {
    const room = this.consultationRooms.get(consultationId);
    return room ? Array.from(room) : [];
  }
}

module.exports = SocketServer;
