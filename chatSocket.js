// import { Server } from "socket.io";
// import prisma from "./config/database.js";
// import minioService from "./service/minioService.js"; // ✅ pakai MinIO

// let io;
// let doctorAvailabilityInterval;

// export function initChatSocket(server) {
//   io = new Server(server, {
//     cors: {
//       origin: process.env.FRONTEND_URL || "https://localhost:3000" || "*",
//       methods: ["GET", "POST"],
//     },
//   });

//   console.log("✅ Socket.IO initialized");

//   io.on("connection", (socket) => {
//     console.log(`🟢 Client connected: ${socket.id}`);

//     // 🧩 JOIN CHAT ROOM
//     socket.on("join_chat", (chatId) => {
//       const roomName = `chat:${chatId}`;
//       socket.join(roomName);
//       console.log(`👋 Socket ${socket.id} joined room: ${roomName}`);

//       socket.to(roomName).emit("user_joined", {
//         socketId: socket.id,
//         chatId,
//         timestamp: new Date(),
//       });
//     });

//     // 💬 SEND MESSAGE (text / image / pdf)
//     socket.on("send_message", async (payload) => {
//       try {
//         const { chatId, sender, content, type = "text", fileData } = payload;

//         if (!chatId || !sender || (!content && !fileData))
//           return socket.emit("error", { message: "Missing required fields" });

//         // 🔍 Ambil chat + relasi
//         const chat = await prisma.chat.findUnique({
//           where: { id: chatId },
//           include: {
//             doctor: { include: { schedules: true } },
//             user: { select: { id: true, fullname: true } },
//           },
//         });

//         if (!chat) return socket.emit("error", { message: "Chat not found" });
//         if (!chat.isActive)
//           return socket.emit("error", { message: "Chat is not active" });
//         if (chat.expiredAt && new Date() > chat.expiredAt)
//           return socket.emit("error", { message: "Chat expired" });

//         const now = new Date();

//         // ✅ find or create today's ChatDate
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         let chatDate = await prisma.chatDate.findFirst({
//           where: { chatId: chat.id, date: today },
//         });

//         if (!chatDate) {
//           chatDate = await prisma.chatDate.create({
//             data: { chatId: chat.id, date: today },
//           });
//         }

//         // 🖼️ Upload ke MinIO jika file
//         let finalContent = content;
//         if (fileData && (type === "image" || type === "pdf")) {
//           try {
//             finalContent = await minioService.uploadBase64(fileData, type);
//           } catch (uploadErr) {
//             console.error("❌ MinIO upload failed:", uploadErr);
//             return socket.emit("error", { message: "File upload failed" });
//           }
//         }

//         // 💾 Simpan pesan ke database
//         const savedMessage = await prisma.chatMessage.create({
//           data: {
//             chatDateId: chatDate.id,
//             sender,
//             content: finalContent,
//             type,
//             sentAt: now,
//           },
//           include: {
//             chatDate: {
//               include: {
//                 chat: {
//                   include: {
//                     user: { select: { id: true, fullname: true, photo: true } },
//                     doctor: {
//                       select: { id: true, fullname: true, photo: true },
//                     },
//                   },
//                 },
//               },
//             },
//           },
//         });

//         await prisma.chat.update({
//           where: { id: chat.id },
//           data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
//         });

//         // 📢 Broadcast ke room
//         const roomName = `chat:${chatId}`;
//         const messagePayload = {
//           messageId: savedMessage.id,
//           chatId,
//           sender: savedMessage.sender,
//           type,
//           content: savedMessage.content,
//           sentAt: savedMessage.sentAt,
//           user: savedMessage.chatDate.chat.user,
//           doctor: savedMessage.chatDate.chat.doctor,
//           timestamp: new Date(),
//         };

//         io.to(roomName).emit("new_message", messagePayload);
//         console.log(`📩 Broadcast new_message to ${roomName}`, messagePayload);
//       } catch (err) {
//         console.error("❌ Error send_message:", err);
//         socket.emit("error", { message: "Internal server error" });
//       }
//     });

//     // 🚪 LEAVE CHAT ROOM
//     socket.on("leave_chat", (chatId) => {
//       const roomName = `chat:${chatId}`;
//       socket.leave(roomName);
//       console.log(`🚪 Socket ${socket.id} left room ${roomName}`);

//       socket.to(roomName).emit("user_left", {
//         socketId: socket.id,
//         chatId,
//         timestamp: new Date(),
//       });
//     });

//     // 🔌 DISCONNECT
//     socket.on("disconnect", () => console.log(`🔴 Disconnected: ${socket.id}`));
//   });

//   startDoctorAvailabilityNotification();
// }

// export function startDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);

//   doctorAvailabilityInterval = setInterval(async () => {
//     try {
//       const now = new Date();
//       const currentDay = now.getDay();
//       const currentTime = now.getHours() * 60 + now.getMinutes();

//       const activeChats = await prisma.chat.findMany({
//         where: { isActive: true },
//         include: {
//           doctor: { include: { schedules: true } },
//         },
//       });

//       for (const chat of activeChats) {
//         const isDoctorAvailable = chat.doctor.schedules.some((s) => {
//           if (s.dayOfWeek !== currentDay) return false;
//           const st = new Date(s.startTime);
//           const et = new Date(s.endTime);
//           const startMins = st.getHours() * 60 + st.getMinutes();
//           const endMins = et.getHours() * 60 + et.getMinutes();
//           return currentTime >= startMins && currentTime <= endMins;
//         });

//         if (isDoctorAvailable) {
//           io.to(`chat:${chat.id}`).emit("doctor_ready", {
//             chatId: chat.id,
//             doctorId: chat.doctorId,
//             doctorName: chat.doctor.fullname,
//             timestamp: new Date(),
//           });
//         }
//       }

//       console.log(
//         `✅ Checked doctor availability for ${activeChats.length} chats`
//       );
//     } catch (e) {
//       console.error("Doctor availability error:", e);
//     }
//   }, 120000);

//   console.log("⏱️ Doctor availability check every 120s");
// }

// export function stopDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) {
//     clearInterval(doctorAvailabilityInterval);
//     doctorAvailabilityInterval = null;
//   }
// }

// export function getIO() {
//   if (!io) throw new Error("Socket.IO not initialized");
//   return io;
// }

// process.on("SIGINT", stopDoctorAvailabilityNotification);
// process.on("SIGTERM", stopDoctorAvailabilityNotification);

import { Server } from "socket.io";
import prisma from "./config/database.js";
import minioService from "./service/minioService.js";

let io;
let doctorAvailabilityInterval;

/**
 * 🔌 Inisialisasi Socket.IO
 */
export function initChatSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("✅ Socket.IO initialized");

  io.on("connection", (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    // 🧩 Join chat room
    socket.on("join_chat", (chatId) => {
      const roomName = `chat:${chatId}`;
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

        if (!chatId || !sender || (!content && !fileData)) {
          const error = { message: "Missing required fields" };
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }

        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          select: {
            id: true,
            isActive: true,
            expiredAt: true,
            userId: true,
            doctorId: true,
          },
        });

        if (!chat) {
          const error = { message: "Chat not found" };
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }
        if (!chat.isActive) {
          const error = { message: "Chat is not active" };
          socket.emit("error", error);
          if (callback) callback({ success: false, error: error.message });
          return;
        }
        if (chat.expiredAt && new Date() > chat.expiredAt) {
          const error = { message: "Chat expired" };
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
        if (fileData && (type === "image" || type === "file" || type === "pdf")) {
          try {
            finalContent = await minioService.uploadBase64(fileData, type);
            console.log(`✅ File uploaded to MinIO: ${finalContent}`);
          } catch (uploadErr) {
            console.error("❌ MinIO upload failed:", uploadErr);
            const error = { message: "File upload failed" };
            socket.emit("error", error);
            if (callback) callback({ success: false, error: error.message });
            return;
          }
        }

        // 💾 Simpan pesan ke DB
        const savedMessage = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender,
            content: finalContent,
            type,
          },
        });

        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
        });

        // 📢 Broadcast message to all clients in room
        const messagePayload = {
          messageId: savedMessage.id,
          chatId,
          sender,
          type,
          content: finalContent,
          sentAt: savedMessage.sentAt,
        };

        const roomName = `chat:${chatId}`;
        io.to(roomName).emit("new_message", messagePayload);
        console.log(`📩 Broadcast new_message to ${roomName}:`, messagePayload);

        // ✅ Send success callback to sender
        if (callback) {
          callback({
            success: true,
            data: messagePayload,
          });
        }
      } catch (err) {
        console.error("❌ Error send_message:", err);
        const error = { message: "Internal server error" };
        socket.emit("error", error);
        if (callback) callback({ success: false, error: error.message });
      }
    });

    // 🚪 Leave room
    socket.on("leave_chat", (chatId) => {
      const roomName = `chat:${chatId}`;
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
  return io;
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
          io.to(`chat:${chat.id}`).emit("doctor_ready", {
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
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

process.on("SIGINT", stopDoctorAvailabilityNotification);
process.on("SIGTERM", stopDoctorAvailabilityNotification);
