import { Server } from "socket.io";
import prisma from "./config/database.js";
import minioService from "./service/minioService.js";

let ioInstance;
let doctorAvailabilityInterval;

/**
 * 🔌 Inisialisasi Socket.IO
 * @param {Server} socketIo - Socket.IO server instance
 */
export function initChatSocket(socketIo) {
  ioInstance = socketIo;

  console.log("✅ Socket.IO initialized");

  ioInstance.on("connection", (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    // 🧩 Join chat room
    socket.on("join_chat", (chatId) => {
      const roomName = `${chatId}`;
      socket.join(roomName);
      console.log(`👋 ${socket.id} joined room ${roomName}`);
      socket.to(roomName).emit("user_joined", {
        socketId: socket.id,
        chatId,
        timestamp: new Date(),
      });
    });

    // 💬 Send message (text / image / pdf) - with callback support
    socket.on("send_message", async (payload, callback) => {
      try {
        const { chatId, sender, content, type = "text", fileData } = payload;

        console.log(`📨 Received send_message:`, {
          chatId,
          sender,
          type,
          contentLength: content?.length || 0,
          hasFileData: !!fileData,
        });

        if (!chatId || !sender || (!content && !fileData)) {
          const error = { message: "Missing required fields" };
          console.error("❌ Validation failed:", error);
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        // Find chat by ID
        let chat = await prisma.chat.findUnique({
          where: {
            id: chatId,
          },
          select: {
            id: true,
            isActive: true,
            expiredAt: true,
            userId: true,
            doctorId: true,
          },
        });

        if (!chat) {
          const error = { message: `Chat not found: ${chatId}` };
          console.error("❌ Chat not found:", chatId);
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        console.log(`✅ Chat found:`, {
          id: chat.id,
          chatKey: chat.chatKey,
          isActive: chat.isActive,
        });

        if (!chat.isActive) {
          const error = { message: "Chat is not active" };
          console.error("❌ Chat not active:", chat.id);
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }
        if (chat.expiredAt && new Date() > chat.expiredAt) {
          const error = { message: "Chat expired" };
          console.error("❌ Chat expired:", chat.expiredAt);
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        // ✅ Upsert ChatDate (optimized)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const chatDate = await prisma.chatDate.upsert({
          where: {
            chatId_date: {
              chatId: chat.id,
              date: today,
            },
          },
          update: {},
          create: {
            chatId: chat.id,
            date: today,
          },
          select: { id: true },
        });

        // 🖼️ Upload file jika ada
        let finalContent = content;
        if (
          fileData &&
          (type === "image" || type === "file" || type === "pdf")
        ) {
          try {
            console.log(`📤 Uploading ${type} to MinIO...`);
            finalContent = await minioService.uploadBase64(fileData, type);
            console.log(`✅ File uploaded to MinIO: ${finalContent}`);
          } catch (uploadErr) {
            console.error("❌ MinIO upload failed:", uploadErr);
            const error = {
              message: "File upload failed: " + uploadErr.message,
            };
            socket.emit("error", error);
            if (callback) callback({ success: false, error: error.message });
            return;
          }
        }

        console.log(`💾 Saving message to database...`);

        // 💾 Simpan pesan ke DB
        const savedMessage = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender,
            content: finalContent,
            type,
          },
        });

        console.log(`✅ Message saved:`, savedMessage.id);

        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
        });

        // 📢 Broadcast message to all clients in room
        const messagePayload = {
          messageId: savedMessage.id,
          chatId: chat.id,
          sender,
          type,
          content: finalContent,
          sentAt: savedMessage.sentAt,
        };

        const roomName = `chat:${chat.id}`; // Use chat.id (UUID) not chatId from payload
        ioInstance.to(roomName).emit("new_message", messagePayload);
        console.log(`✅ Broadcast new_message to ${roomName}`);

        // ✅ Send success callback to sender
        console.log(`✅ Sending callback to client...`);
        if (callback) {
          callback({
            success: true,
            data: messagePayload,
          });
          console.log(`✅ Callback sent successfully`);
        } else {
          console.warn(`⚠️ No callback function provided`);
        }
      } catch (err) {
        console.error("❌ Error send_message:", err);
        const error = { message: "Internal server error: " + err.message };
        socket.emit("error", error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 🚪 Leave room
    socket.on("leave_chat", (chatId) => {
      const roomName = `${chatId}`;
      socket.leave(roomName);
      console.log(`🚪 ${socket.id} left ${roomName}`);
      socket.to(roomName).emit("user_left", {
        socketId: socket.id,
        chatId,
        timestamp: new Date(),
      });
    });

    // 🔌 Disconnect
    socket.on("disconnect", () => {
      console.log(`🔴 Disconnected: ${socket.id}`);
    });
  });

  startDoctorAvailabilityNotification();
  return ioInstance;
}

/**
 * 🕒 Cek ketersediaan dokter setiap 120 detik (versi ringan)
 */
export function startDoctorAvailabilityNotification() {
  if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);

  doctorAvailabilityInterval = setInterval(async () => {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // 🔹 Ambil semua chat aktif (tanpa join berat)
      const activeChats = await prisma.chat.findMany({
        where: { isActive: true },
        select: { id: true, doctorId: true },
      });

      if (activeChats.length === 0) return;

      const doctorIds = [...new Set(activeChats.map((c) => c.doctorId))];
      const doctors = await prisma.doctor.findMany({
        where: { id: { in: doctorIds } },
        include: { schedules: true },
      });

      for (const chat of activeChats) {
        const doctor = doctors.find((d) => d.id === chat.doctorId);
        if (!doctor) continue;

        const isDoctorAvailable = doctor.schedules.some((s) => {
          if (s.dayOfWeek !== currentDay) return false;
          const st = new Date(s.startTime);
          const et = new Date(s.endTime);
          const startMins = st.getHours() * 60 + st.getMinutes();
          const endMins = et.getHours() * 60 + et.getMinutes();
          return currentTime >= startMins && currentTime <= endMins;
        });

        if (isDoctorAvailable) {
          ioInstance.to(`chat:${chat.id}`).emit("doctor_ready", {
            chatId: chat.id,
            doctorId: doctor.id,
            doctorName: doctor.fullname,
            timestamp: new Date(),
          });
        }
      }

      console.log(
        `✅ Checked doctor availability for ${activeChats.length} chats`
      );
    } catch (err) {
      console.error("❌ Doctor availability error:", err);
    }
  }, 120000);

  console.log("⏱️ Doctor availability check every 120s");
}

/**
 * 🔻 Stop scheduler saat shutdown
 */
export function stopDoctorAvailabilityNotification() {
  if (doctorAvailabilityInterval) {
    clearInterval(doctorAvailabilityInterval);
    doctorAvailabilityInterval = null;
  }
}

/**
 * 🧩 Ambil instance IO
 */
export function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
}

process.on("SIGINT", stopDoctorAvailabilityNotification);
process.on("SIGTERM", stopDoctorAvailabilityNotification);
