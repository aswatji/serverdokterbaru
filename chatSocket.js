// import { Server } from "socket.io";
// import prisma from "./config/database.js";
// import minioService from "./service/minioService.js";

// let ioInstance;
// let doctorAvailabilityInterval;

// // Cache doctorId agar tidak hit DB terus menerus
// const chatDoctorCache = new Map(); // chatId -> { doctorId, expiresAt }
// const CHAT_DOCTOR_CACHE_TTL = 60 * 1000; // 60s TTL

// function cacheSetChatDoctor(chatId, doctorId) {
//   chatDoctorCache.set(chatId, {
//     doctorId,
//     expiresAt: Date.now() + CHAT_DOCTOR_CACHE_TTL,
//   });
// }

// function cacheGetChatDoctor(chatId) {
//   const rec = chatDoctorCache.get(chatId);
//   if (!rec) return null;
//   if (Date.now() > rec.expiresAt) {
//     chatDoctorCache.delete(chatId);
//     return null;
//   }
//   return rec.doctorId;
// }

// // Cleanup cache berkala
// setInterval(() => {
//   const now = Date.now();
//   for (const [chatId, rec] of chatDoctorCache.entries()) {
//     if (rec.expiresAt <= now) chatDoctorCache.delete(chatId);
//   }
// }, 30 * 1000);

// export function initChatSocket(socketIo) {
//   ioInstance = socketIo;

//   console.log("✅ Socket.IO initialized");

//   ioInstance.on("connection", (socket) => {
//     console.log(`🟢 Client connected: ${socket.id}`);

//     // Join room dokter (opsional)
//     try {
//       const maybeAuth = socket.handshake?.auth || socket.data;
//       if (maybeAuth?.doctorId) {
//         const docRoom = `doctor:${maybeAuth.doctorId}`;
//         socket.join(docRoom);
//         console.log(`Auto-joined doctor room: ${docRoom}`);
//       }
//     } catch (err) {
//       console.error("❌ Error auto-joining doctor room:", err);
//     }

//     // 🩺 Manual Doctor Join
//     socket.on("doctor_join", async ({ doctorId }) => {
//       if (doctorId) {
//         const roomName = `doctor:${doctorId}`;
//         socket.join(roomName);
//         console.log(`👨‍⚕️ Doctor joined: ${roomName}`);
//       }
//     });

//     // 🧩 Join Chat Room
//     socket.on("join_chat", async (chatId, callback) => {
//       try {
//         if (!chatId) {
//           if (callback) callback({ success: false, error: "chatId required" });
//           return;
//         }

//         const roomName = `chat:${chatId}`; // ✅ Prefix Chat
//         socket.join(roomName);

//         const roomSize =
//           ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
//         console.log(`👋 ${socket.id} joined ${roomName} (${roomSize} members)`);

//         // Emit status pembayaran saat join
//         try {
//           const chat = await prisma.chat.findUnique({
//             where: { id: chatId },
//             include: { payment: true },
//           });

//           if (chat) {
//             socket.emit("payment_status", {
//               chatId,
//               paymentId: chat.payment?.id || null,
//               paidAt: chat.payment?.paidAt || null,
//               expiresAt: chat.payment?.expiresAt || null,
//               isActive: chat.isActive,
//             });
//           }
//         } catch (err) {
//           console.error("❌ Fetch chat payment status error:", err);
//         }

//         if (callback) callback({ success: true, roomName });
//       } catch (err) {
//         console.error("❌ Join chat error:", err);
//       }
//     });

//     // ✏️ Typing Indicator
//     socket.on("typing", ({ chatId, sender }) => {
//       const roomName = `chat:${chatId}`;
//       socket.to(roomName).emit("typing", { chatId, sender });
//     });

//     socket.on("stop_typing", ({ chatId, sender }) => {
//       const roomName = `chat:${chatId}`;
//       socket.to(roomName).emit("stop_typing", { chatId, sender });
//     });

//     // 👁️ Mark as Read (Logic Role: 'doctor' or 'user')
//     socket.on("mark_as_read", async ({ chatId, role }) => {
//       // role: "doctor" (berarti dokter yang baca) atau "user" (user yang baca)
//       try {
//         console.log(`👁️ Mark as read: Chat=${chatId}, Reader=${role}`);

//         // Jika DOKTER yang baca -> Reset unread milik dokter
//         // Jika USER yang baca -> Reset unread milik user

//         let whereCondition = {};

//         if (role === "doctor") {
//            whereCondition = { chatId, doctorId: { not: null } }; // Reset record unread milik dokter
//         } else {
//            whereCondition = { chatId, userId: { not: null } }; // Reset record unread milik user
//         }

//         await prisma.chatUnread.updateMany({
//           where: whereCondition,
//           data: { unreadCount: 0 },
//         });

//         ioInstance.to(`chat:${chatId}`).emit("update_unread", {
//           chatId,
//           role, // Beri tahu FE siapa yang baru saja membaca
//           unreadCount: 0,
//         });

//       } catch (err) {
//         console.error("❌ Mark as read error:", err);
//       }
//     });

//     // 💬 Send Message (Text Only via Socket)
//     // Gambar via API Upload, Text via Socket (Hybrid)
//     socket.on("send_message", async (payload, callback) => {
//       try {
//         const { chatId, sender, content, type = "text", fileData } = payload;
//         // sender harus berisi string "doctor" atau "user"

//         if (!chatId || !sender || (!content && !fileData)) {
//           if (callback) callback({ success: false, error: "Data incomplete" });
//           return;
//         }

//         // Cek Chat
//         const chat = await prisma.chat.findUnique({
//           where: { id: chatId },
//           select: { id: true, isActive: true, userId: true, doctorId: true, chatKey: true }
//         });

//         if (!chat || !chat.isActive) {
//           if (callback) callback({ success: false, error: "Chat inactive" });
//           return;
//         }

//         // Upsert ChatDate
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const chatDate = await prisma.chatDate.upsert({
//           where: { chatId_date: { chatId: chat.id, date: today } },
//           update: {},
//           create: { chatId: chat.id, date: today },
//           select: { id: true },
//         });

//         // Simpan Pesan (sender = role string)
//         const savedMessage = await prisma.chatMessage.create({
//           data: {
//             chatDateId: chatDate.id,
//             sender: sender, // "doctor" atau "user"
//             content,
//             type,
//           },
//         });

//         // Update Chat
//         await prisma.chat.update({
//           where: { id: chat.id },
//           data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
//         });

//         // Broadcast
//         const messagePayload = {
//           id: savedMessage.id,
//           chatId: chat.id,
//           chatDateId: chatDate.id,
//           chatKey: chat.chatKey,
//           sender, // string role
//           content,
//           type,
//           sentAt: savedMessage.sentAt,
//           chatDate: { date: today.toISOString() },
//         };

//         const roomName = `chat:${chat.id}`;
//         ioInstance.to(roomName).emit("new_message", messagePayload);
//         console.log(`📢 Broadcast text to ${roomName} (Sender: ${sender})`);

//         // Update Unread Logic (Sederhana berdasarkan Role)
//         try {
//           if (sender === "user") {
//             // User kirim -> Dokter belum baca
//             const unread = await prisma.chatUnread.upsert({
//               where: { chatId_doctorId_userId: { chatId: chat.id, doctorId: chat.doctorId, userId: null } },
//               update: { unreadCount: { increment: 1 } },
//               create: { chatId: chat.id, doctorId: chat.doctorId, unreadCount: 1 },
//               select: { unreadCount: true }
//             });
//             ioInstance.to(roomName).emit("update_unread", { role: "doctor", count: unread.unreadCount });

//           } else if (sender === "doctor") {
//             // Dokter kirim -> User belum baca
//             const unread = await prisma.chatUnread.upsert({
//               where: { chatId_userId_doctorId: { chatId: chat.id, userId: chat.userId, doctorId: null } },
//               update: { unreadCount: { increment: 1 } },
//               create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
//               select: { unreadCount: true }
//             });
//             ioInstance.to(roomName).emit("update_unread", { role: "user", count: unread.unreadCount });
//           }
//         } catch (e) { console.error("Unread update error", e); }

//         if (callback) callback({ success: true, data: messagePayload });

//       } catch (err) {
//         console.error("❌ Send message error:", err);
//         if (callback) callback({ success: false, error: err.message });
//       }
//     });

//     // 🚪 Leave Room
//     socket.on("leave_chat", (chatId) => {
//       const roomName = `chat:${chatId}`;
//       socket.leave(roomName);
//       console.log(`🚪 ${socket.id} left ${roomName}`);
//     });

//     socket.on("disconnect", () => {
//       console.log(`🔴 Disconnected: ${socket.id}`);
//     });
//   });

//   startDoctorAvailabilityNotification();
//   return ioInstance;
// }

// export function startDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);
//   // ... (Logic availability sama seperti sebelumnya, biarkan saja)
// }

// export function stopDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);
// }

// export function getIO() {
//   if (!ioInstance) throw new Error("Socket.IO not initialized");
//   return ioInstance;
// }
import { Server } from "socket.io";
import prisma from "./config/database.js";
import { sendPushNotification } from "./utils/notification.js"; // 👈 WAJIB IMPORT INI

let ioInstance;
let doctorAvailabilityInterval;

// Cache doctorId agar tidak hit DB terus menerus
const chatDoctorCache = new Map();
const CHAT_DOCTOR_CACHE_TTL = 60 * 1000;

function cacheSetChatDoctor(chatId, doctorId) {
  chatDoctorCache.set(chatId, {
    doctorId,
    expiresAt: Date.now() + CHAT_DOCTOR_CACHE_TTL,
  });
}

function cacheGetChatDoctor(chatId) {
  const rec = chatDoctorCache.get(chatId);
  if (!rec) return null;
  if (Date.now() > rec.expiresAt) {
    chatDoctorCache.delete(chatId);
    return null;
  }
  return rec.doctorId;
}

// Cleanup cache berkala
setInterval(() => {
  const now = Date.now();
  for (const [chatId, rec] of chatDoctorCache.entries()) {
    if (rec.expiresAt <= now) chatDoctorCache.delete(chatId);
  }
}, 30 * 1000);

export function initChatSocket(socketIo) {
  ioInstance = socketIo;

  console.log("✅ Socket.IO initialized");

  ioInstance.on("connection", (socket) => {
    console.log(`🟢 Client connected: ${socket.id}`);

    // Join room dokter (opsional)
    try {
      const maybeAuth = socket.handshake?.auth || socket.data;
      if (maybeAuth?.doctorId) {
        const docRoom = `doctor:${maybeAuth.doctorId}`;
        socket.join(docRoom);
        console.log(`Auto-joined doctor room: ${docRoom}`);
      }
    } catch (err) {
      console.error("❌ Error auto-joining doctor room:", err);
    }

    // 🩺 Manual Doctor Join
    socket.on("doctor_join", async ({ doctorId }) => {
      if (doctorId) {
        const roomName = `doctor:${doctorId}`;
        socket.join(roomName);
        console.log(`👨‍⚕️ Doctor joined: ${roomName}`);
      }
    });

    // 🧩 Join Chat Room
    socket.on("join_chat", async (chatId, callback) => {
      try {
        if (!chatId) {
          if (callback) callback({ success: false, error: "chatId required" });
          return;
        }

        const roomName = `chat:${chatId}`;
        socket.join(roomName);

        const roomSize =
          ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
        console.log(`👋 ${socket.id} joined ${roomName} (${roomSize} members)`);

        try {
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { payment: true },
          });

          if (chat) {
            socket.emit("payment_status", {
              chatId,
              paymentId: chat.payment?.id || null,
              paidAt: chat.payment?.paidAt || null,
              expiresAt: chat.payment?.expiresAt || null,
              isActive: chat.isActive,
            });
          }
        } catch (err) {
          console.error("❌ Fetch chat payment status error:", err);
        }

        if (callback) callback({ success: true, roomName });
      } catch (err) {
        console.error("❌ Join chat error:", err);
      }
    });

    // ✏️ Typing Indicator
    socket.on("typing", ({ chatId, sender }) => {
      const roomName = `chat:${chatId}`;
      socket.to(roomName).emit("typing", { chatId, sender });
    });

    socket.on("stop_typing", ({ chatId, sender }) => {
      const roomName = `chat:${chatId}`;
      socket.to(roomName).emit("stop_typing", { chatId, sender });
    });

    // 👁️ Mark as Read
    socket.on("mark_as_read", async ({ chatId, role }) => {
      try {
        let prismaWhere = {};
        if (role === "doctor") {
          prismaWhere = { chatId, doctorId: { not: null } };
        } else {
          prismaWhere = { chatId, userId: { not: null } };
        }

        await prisma.chatUnread.updateMany({
          where: prismaWhere,
          data: { unreadCount: 0 },
        });

        ioInstance.to(`chat:${chatId}`).emit("update_unread", {
          chatId,
          role,
          unreadCount: 0,
        });
      } catch (err) {
        console.error("❌ Mark as read error:", err);
      }
    });

    // 💬 Send Message (Text Only via Socket)
    socket.on("send_message", async (payload, callback) => {
      try {
        const { chatId, sender, content, type = "text", fileData } = payload;

        if (!chatId || !sender || (!content && !fileData)) {
          if (callback) callback({ success: false, error: "Data incomplete" });
          return;
        }

        // 1. Ambil Data Chat BESERTA Token User & Doctor
        // Kita ubah dari select biasa menjadi include relation
        const chat = await prisma.chat.findUnique({
          where: { id: chatId },
          include: {
            user: { select: { id: true, fullname: true, pushToken: true } },
            doctor: { select: { id: true, fullname: true, pushToken: true } },
          },
        });

        if (!chat || !chat.isActive) {
          if (callback) callback({ success: false, error: "Chat inactive" });
          return;
        }

        // Upsert ChatDate
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chatDate = await prisma.chatDate.upsert({
          where: { chatId_date: { chatId: chat.id, date: today } },
          update: {},
          create: { chatId: chat.id, date: today },
          select: { id: true },
        });

        // Simpan Pesan
        const savedMessage = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: sender,
            content,
            type,
          },
        });

        // Update Chat
        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
        });

        // Broadcast ke Socket
        const messagePayload = {
          id: savedMessage.id,
          chatId: chat.id,
          chatDateId: chatDate.id,
          chatKey: chat.chatKey,
          sender,
          content,
          type,
          sentAt: savedMessage.sentAt,
          chatDate: { date: today.toISOString() },
        };

        const roomName = `chat:${chat.id}`;
        ioInstance.to(roomName).emit("new_message", messagePayload);
        console.log(`📢 Broadcast text to ${roomName} (Sender: ${sender})`);

        // Update Unread Logic (Fixed)
        try {
          if (sender === "user") {
            const unread = await prisma.chatUnread.upsert({
              where: {
                chatId_doctorId: { chatId: chat.id, doctorId: chat.doctorId },
              },
              update: { unreadCount: { increment: 1 } },
              create: {
                chatId: chat.id,
                doctorId: chat.doctorId,
                userId: null,
                unreadCount: 1,
              },
              select: { unreadCount: true },
            });
            ioInstance.to(roomName).emit("update_unread", {
              role: "doctor",
              count: unread.unreadCount,
            });
          } else if (sender === "doctor") {
            const unread = await prisma.chatUnread.upsert({
              where: {
                chatId_userId: { chatId: chat.id, userId: chat.userId },
              },
              update: { unreadCount: { increment: 1 } },
              create: {
                chatId: chat.id,
                userId: chat.userId,
                doctorId: null,
                unreadCount: 1,
              },
              select: { unreadCount: true },
            });
            ioInstance.to(roomName).emit("update_unread", {
              role: "user",
              count: unread.unreadCount,
            });
          }
        } catch (e) {
          console.error("⚠️ Unread update error:", e.message);
        }

        // Callback sukses ke pengirim agar UI update
        if (callback) callback({ success: true, data: messagePayload });

        // ==========================================================
        // 🔥 [BARU] KIRIM PUSH NOTIFICATION (Non-blocking)
        // ==========================================================
        setImmediate(async () => {
          try {
            // Tentukan Penerima
            const isSenderUser = sender === "user";
            const receiver = isSenderUser ? chat.doctor : chat.user;
            const senderName = isSenderUser
              ? chat.user.fullname
              : chat.doctor.fullname;

            // Pastikan token ada
            if (receiver && receiver.pushToken) {
              const notifBody =
                content.length > 50
                  ? content.substring(0, 50) + "..."
                  : content;

              await sendPushNotification(
                receiver.pushToken,
                senderName || "Pesan Baru", // Title
                notifBody, // Body
                { chatId: chat.id, chatKey: chat.chatKey } // Data Payload
              );
              console.log(
                `🔔 Notif sent to ${receiver.fullname} (${receiver.pushToken})`
              );
            } else {
              console.log(
                `⚠️ Skip Notif: Token kosong untuk ${
                  isSenderUser ? "Doctor" : "User"
                }`
              );
            }
          } catch (notifErr) {
            console.error("❌ Notif Error in Socket:", notifErr);
          }
        });
        // ==========================================================
      } catch (err) {
        console.error("❌ Send message error:", err);
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on("leave_chat", (chatId) => {
      const roomName = `chat:${chatId}`;
      socket.leave(roomName);
      console.log(`🚪 ${socket.id} left ${roomName}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔴 Disconnected: ${socket.id}`);
    });
  });

  startDoctorAvailabilityNotification();
  return ioInstance;
}

export function startDoctorAvailabilityNotification() {
  if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);
}

export function stopDoctorAvailabilityNotification() {
  if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);
}

export function getIO() {
  if (!ioInstance) throw new Error("Socket.IO not initialized");
  return ioInstance;
}
