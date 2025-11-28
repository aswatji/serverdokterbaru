// import { Server } from "socket.io";
// import prisma from "./config/database.js";
// import minioService from "./service/minioService.js";

// let ioInstance;
// let doctorAvailabilityInterval;

// /**
//  * 🔌 Inisialisasi Socket.IO
//  * @param {Server} socketIo - Socket.IO server instance
//  */
// export function initChatSocket(socketIo) {
//   ioInstance = socketIo;

//   console.log("✅ Socket.IO initialized");

//   ioInstance.on("connection", (socket) => {
//     console.log(`🟢 Client connected: ${socket.id}`);

//     // 🧩 Join chat room
//     socket.on("join_chat", (chatId) => {
//       const roomName = `chat:${chatId}`; // ✅ CRITICAL: Consistent prefix
//       socket.join(roomName);
//       const roomSize =
//         ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
//       console.log(`👋 ${socket.id} joined ${roomName} (${roomSize} members)`);
//       socket.to(roomName).emit("user_joined", {
//         socketId: socket.id,
//         chatId,
//         timestamp: new Date(),
//       });
//     });

//     // ✏️ User sedang mengetik
//     socket.on("typing", ({ chatId, sender }) => {
//       const roomName = `chat:${chatId}`;
//       socket.to(roomName).emit("typing", { chatId, sender });
//     });

//     // ✅ User berhenti mengetik
//     socket.on("stop_typing", ({ chatId, sender }) => {
//       const roomName = `chat:${chatId}`;
//       socket.to(roomName).emit("stop_typing", { chatId, sender });
//     });

//     // 👁️ Mark as read - MOVED: register once per connection
//     socket.on("mark_as_read", async ({ chatId, userId, doctorId }) => {
//       try {
//         console.log(
//           `👁️ Mark as read: chatId=${chatId}, userId=${userId}, doctorId=${doctorId}`
//         );

//         await prisma.chatUnread.updateMany({
//           where: { chatId, OR: [{ userId }, { doctorId }] },
//           data: { unreadCount: 0 },
//         });

//         const roomName = `chat:${chatId}`; // ✅ Consistent naming
//         ioInstance.to(roomName).emit("update_unread", {
//           chatId,
//           userId,
//           doctorId,
//           unreadCount: 0,
//         });

//         console.log(`✅ Unread reset for chat ${chatId}`);
//       } catch (err) {
//         console.error("❌ Error mark_as_read:", err);
//         socket.emit("error", {
//           message: "Failed to mark as read: " + err.message,
//         });
//       }
//     });

//     // 💬 Send message (text / image / pdf) - with callback support
//     socket.on("send_message", async (payload, callback) => {
//       try {
//         const { chatId, sender, content, type = "text", fileData } = payload;

//         // ✅ Enhanced logging
//         console.log(`📨 [send_message] Received:`, {
//           chatId,
//           sender,
//           type,
//           contentLength: content?.length || 0,
//           hasFileData: !!fileData,
//           socketId: socket.id,
//           timestamp: new Date().toISOString(),
//         });

//         if (!chatId || !sender || (!content && !fileData)) {
//           const error = { message: "Missing required fields" };
//           console.error("❌ Validation failed:", error);
//           socket.emit("error", error);
//           if (callback) callback({ success: false, error: error.message });
//           return;
//         }

//         // Find chat by ID
//         let chat = await prisma.chat.findUnique({
//           where: {
//             id: chatId,
//           },
//           select: {
//             id: true,
//             chatKey: true, // ✅ Include chatKey
//             isActive: true,
//             userId: true,
//             doctorId: true,
//           },
//         });

//         if (!chat) {
//           const error = { message: `Chat not found: ${chatId}` };
//           console.error("❌ Chat not found:", chatId);
//           socket.emit("error", error);
//           if (callback) callback({ success: false, error: error.message });
//           return;
//         }

//         console.log(`✅ Chat found:`, {
//           id: chat.id,
//           chatKey: chat.chatKey,
//           isActive: chat.isActive,
//         });

//         if (!chat.isActive) {
//           const error = { message: "Chat is not active" };
//           console.error("❌ Chat not active:", chat.id);
//           socket.emit("error", error);
//           if (callback) callback({ success: false, error: error.message });
//           return;
//         }
//         // ✅ REMOVED: expiredAt check - handled by frontend
//         // Frontend will handle chat expiration based on payment.expiresAt
//         try {
//           if (sender === chat.userId) {
//             // User kirim pesan → dokter penerima
//             const unread = await prisma.chatUnread.upsert({
//               where: {
//                 chatId_doctorId_userId: {
//                   chatId: chat.id,
//                   doctorId: chat.doctorId,
//                   userId: null,
//                 },
//               },
//               update: { unreadCount: { increment: 1 } },
//               create: {
//                 chatId: chat.id,
//                 doctorId: chat.doctorId,
//                 unreadCount: 1,
//               },
//               select: { unreadCount: true },
//             });

//             ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
//               chatId: chat.id,
//               doctorId: chat.doctorId,
//               unreadCount: unread.unreadCount,
//             });
//           } else if (sender === chat.doctorId) {
//             // Dokter kirim pesan → user penerima
//             const unread = await prisma.chatUnread.upsert({
//               where: {
//                 chatId_userId_doctorId: {
//                   chatId: chat.id,
//                   userId: chat.userId,
//                   doctorId: null,
//                 },
//               },
//               update: { unreadCount: { increment: 1 } },
//               create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
//               select: { unreadCount: true },
//             });

//             ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
//               chatId: chat.id,
//               userId: chat.userId,
//               unreadCount: unread.unreadCount,
//             });
//           }
//         } catch (unreadErr) {
//           console.error("❌ Failed to update unread count:", unreadErr);
//         } // ✅ Upsert ChatDate (optimized)
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);

//         const chatDate = await prisma.chatDate.upsert({
//           where: {
//             chatId_date: {
//               chatId: chat.id,
//               date: today,
//             },
//           },
//           update: {},
//           create: {
//             chatId: chat.id,
//             date: today,
//           },
//           select: { id: true },
//         });

//         // 🖼️ Upload file jika ada
//         let finalContent = content;
//         if (
//           fileData &&
//           (type === "image" || type === "file" || type === "pdf")
//         ) {
//           try {
//             console.log(`📤 Uploading ${type} to MinIO...`);
//             finalContent = await minioService.uploadBase64(fileData, type);
//             console.log(`✅ File uploaded to MinIO: ${finalContent}`);
//           } catch (uploadErr) {
//             console.error("❌ MinIO upload failed:", uploadErr);
//             const error = {
//               message: "File upload failed: " + uploadErr.message,
//             };
//             socket.emit("error", error);
//             if (callback) callback({ success: false, error: error.message });
//             return;
//           }
//         }

//         console.log(`💾 Saving message to database...`);

//         // 💾 Simpan pesan ke DB
//         const savedMessage = await prisma.chatMessage.create({
//           data: {
//             chatDateId: chatDate.id,
//             sender,
//             content: finalContent,
//             type,
//           },
//         });

//         console.log(`✅ Message saved:`, savedMessage.id);

//         await prisma.chat.update({
//           where: { id: chat.id },
//           data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
//         });

//         // 📢 Broadcast message to all clients in room
//         const messagePayload = {
//           id: savedMessage.id, // ✅ PRIMARY ID
//           messageId: savedMessage.id, // ✅ BACKWARD COMPAT
//           chatId: chat.id, // ✅ CHAT UUID
//           chatDateId: chatDate.id, // ✅ REQUIRED BY CLIENT
//           chatKey: chat.chatKey, // ✅ Include chatKey
//           sender,
//           type,
//           content: finalContent,
//           sentAt: savedMessage.sentAt,
//           fileName: payload.fileName || payload.filename, // ✅ FILE METADATA
//           fileUrl: type !== "text" ? finalContent : undefined, // ✅ MEDIA URL
//           chatDate: { date: today.toISOString() }, // ✅ CLIENT COMPATIBILITY
//         };

//         const roomName = `chat:${chat.id}`; // ✅ CRITICAL: Consistent prefix
//         const roomSize =
//           ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
//         console.log(`📢 [new_message] Broadcasting to ${roomName}:`, {
//           messageId: savedMessage.id,
//           type,
//           sender,
//           roomMembers: roomSize,
//         });
//         ioInstance.to(roomName).emit("new_message", messagePayload);
//         console.log(`✅ Broadcast completed to ${roomSize} client(s)`);

//         try {
//           let newUnread;

//           if (sender === chat.userId) {
//             // user kirim pesan → dokter penerima
//             newUnread = await prisma.chatUnread.upsert({
//               where: {
//                 chatId_doctorId: { chatId: chat.id, doctorId: chat.doctorId },
//               },
//               update: { unreadCount: { increment: 1 } },
//               create: {
//                 chatId: chat.id,
//                 doctorId: chat.doctorId,
//                 unreadCount: 1,
//               },
//               select: { unreadCount: true },
//             });

//             ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
//               chatId: chat.id,
//               doctorId: chat.doctorId,
//               unreadCount: newUnread.unreadCount,
//             });
//           } else if (sender === chat.doctorId) {
//             // dokter kirim pesan → user penerima
//             newUnread = await prisma.chatUnread.upsert({
//               where: {
//                 chatId_userId: { chatId: chat.id, userId: chat.userId },
//               },
//               update: { unreadCount: { increment: 1 } },
//               create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
//               select: { unreadCount: true },
//             });

//             ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
//               chatId: chat.id,
//               userId: chat.userId,
//               unreadCount: newUnread.unreadCount,
//             });
//           }
//         } catch (unreadErr) {
//           console.error("❌ Failed to update unread count:", unreadErr);
//         }

//         // ✅ Send success callback to sender
//         if (callback) {
//           callback({
//             success: true,
//             data: messagePayload,
//           });
//           console.log(
//             `✅ [send_message] Callback sent: success=true, messageId=${savedMessage.id}`
//           );
//         } else {
//           console.warn(`⚠️ [send_message] No callback function provided`);
//         }
//       } catch (err) {
//         console.error("❌ [send_message] Error:", err.message);
//         console.error("Stack:", err.stack);
//         const error = { message: "Internal server error: " + err.message };
//         socket.emit("error", error);
//         // ✅ Always call callback on error
//         if (callback) {
//           callback({ success: false, error: err.message });
//           console.log(
//             `❌ [send_message] Callback sent: success=false, error=${err.message}`
//           );
//         }
//       }
//     });

//     // 🚪 Leave room
//     socket.on("leave_chat", (chatId) => {
//       const roomName = `chat:${chatId}`; // ✅ CRITICAL: Consistent prefix
//       socket.leave(roomName);
//       const roomSize =
//         ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
//       console.log(`🚪 ${socket.id} left ${roomName} (${roomSize} remaining)`);
//       socket.to(roomName).emit("user_left", {
//         socketId: socket.id,
//         chatId,
//         timestamp: new Date(),
//       });
//     });

//     // 🔌 Disconnect
//     socket.on("disconnect", () => {
//       console.log(`🔴 Disconnected: ${socket.id}`);
//     });
//   });

//   startDoctorAvailabilityNotification();
//   return ioInstance;
// }

// /**
//  * 🕒 Cek ketersediaan dokter setiap 120 detik (versi ringan)
//  */
// export function startDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) clearInterval(doctorAvailabilityInterval);

//   doctorAvailabilityInterval = setInterval(async () => {
//     try {
//       const now = new Date();
//       const currentDay = now.getDay();
//       const currentTime = now.getHours() * 60 + now.getMinutes();

//       // 🔹 Ambil semua chat aktif (tanpa join berat)
//       const activeChats = await prisma.chat.findMany({
//         where: { isActive: true },
//         select: { id: true, doctorId: true },
//       });

//       if (activeChats.length === 0) return;

//       const doctorIds = [...new Set(activeChats.map((c) => c.doctorId))];
//       const doctors = await prisma.doctor.findMany({
//         where: { id: { in: doctorIds } },
//         include: { schedules: true },
//       });

//       for (const chat of activeChats) {
//         const doctor = doctors.find((d) => d.id === chat.doctorId);
//         if (!doctor) continue;

//         const isDoctorAvailable = doctor.schedules.some((s) => {
//           if (s.dayOfWeek !== currentDay) return false;
//           const st = new Date(s.startTime);
//           const et = new Date(s.endTime);
//           const startMins = st.getHours() * 60 + st.getMinutes();
//           const endMins = et.getHours() * 60 + et.getMinutes();
//           return currentTime >= startMins && currentTime <= endMins;
//         });

//         if (isDoctorAvailable) {
//           ioInstance.to(`chat:${chat.id}`).emit("doctor_ready", {
//             chatId: chat.id,
//             doctorId: doctor.id,
//             doctorName: doctor.fullname,
//             timestamp: new Date(),
//           });
//         }
//       }

//       console.log(
//         `✅ Checked doctor availability for ${activeChats.length} chats`
//       );
//     } catch (err) {
//       console.error("❌ Doctor availability error:", err);
//     }
//   }, 120000);

//   console.log("⏱️ Doctor availability check every 120s");
// }

// /**
//  * 🔻 Stop scheduler saat shutdown
//  */
// export function stopDoctorAvailabilityNotification() {
//   if (doctorAvailabilityInterval) {
//     clearInterval(doctorAvailabilityInterval);
//     doctorAvailabilityInterval = null;
//   }
// }

// /**
//  * 🧩 Ambil instance IO
//  */
// export function getIO() {
//   if (!ioInstance) throw new Error("Socket.IO not initialized");
//   return ioInstance;
// }

// process.on("SIGINT", stopDoctorAvailabilityNotification);
// process.on("SIGTERM", stopDoctorAvailabilityNotification);

// chatSocket.js
import { Server } from "socket.io";
import prisma from "./config/database.js";
import minioService from "./service/minioService.js";

let ioInstance;
let doctorAvailabilityInterval;

/**
 * Simple in-memory cache for mapping chatId -> doctorId
 * - avoids DB hit on every typing event
 * - TTL-based cleanup
 */
const chatDoctorCache = new Map(); // chatId -> { doctorId, expiresAt }
const CHAT_DOCTOR_CACHE_TTL = 60 * 1000; // 60s TTL

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

// Optional periodic cleanup to prevent memory leak (not strictly required)
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

    /**
     * OPTIONAL: auto-join doctor room if handshake/auth contains doctorId
     * You can pass doctorId from frontend at connect time:
     *   const socket = io(url, { auth: { doctorId } })
     * Or fill socket.data in your auth middleware.
     *
     * If you don't use this, frontend should emit "doctor_join" after connect.
     */
    try {
      // Try handshake auth first (socket.handshake.auth) then socket.data (if you fill it)
      const maybeAuth = socket.handshake?.auth || socket.data;
      if (maybeAuth?.doctorId) {
        const docRoom = `doctor:${maybeAuth.doctorId}`;
        socket.join(docRoom);
        console.log(
          `Auto-joined doctor room for ${maybeAuth.doctorId} (${socket.id})`
        );
      }
    } catch (err) {
      console.error("❌ Error while auto-joining doctor room:", err);
    }

    // 🩺 Doctor explicit join to doctor room
    socket.on("doctor_join", async ({ doctorId }) => {
      try {
        if (!doctorId) {
          console.warn("doctor_join called without doctorId by", socket.id);
          return;
        }
        const roomName = `doctor:${doctorId}`;
        socket.join(roomName);
        const roomSize =
          ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
        console.log(
          `👨‍⚕️ Doctor ${doctorId} joined ${roomName} (${roomSize} members)`
        );
      } catch (err) {
        console.error("❌ doctor_join error:", err);
      }
    });

    // 🧩 Join chat room
    // 🧩 Join chat room (ubah ini)
    socket.on("join_chat", async (chatId) => {
      try {
        if (!chatId) return;
        const roomName = `chat:${chatId}`; // CRITICAL: prefix tetap sama
        socket.join(roomName);
        const roomSize =
          ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
        console.log(`👋 ${socket.id} joined ${roomName} (${roomSize} members)`);

        // notify members that someone joined
        socket.to(roomName).emit("user_joined", {
          socketId: socket.id,
          chatId,
          timestamp: new Date(),
        });

        // --- NEW: emit current payment/chat status to the joining socket only ---
        try {
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: { payment: true },
          });

          if (chat && chat.payment) {
            socket.emit("payment_status", {
              chatId,
              paymentId: chat.payment.id,
              paidAt: chat.payment.paidAt
                ? chat.payment.paidAt.toISOString()
                : null,
              expiresAt: chat.payment.expiresAt
                ? chat.payment.expiresAt.toISOString()
                : null,
              isActive: chat.isActive,
            });
          } else {
            // If no payment attached, send minimal status so client can clear timer
            socket.emit("payment_status", {
              chatId,
              paymentId: null,
              isActive: chat?.isActive ?? false,
            });
          }
        } catch (err) {
          console.error("❌ fetch chat on join failed:", err);
          // non-blocking — do not disconnect user if DB read fails
        }
      } catch (err) {
        console.error("❌ join_chat handler error:", err);
      }
    });

    // ✏️ User sedang mengetik - now broadcasts to chat room AND doctor's room
    socket.on(
      "typing",
      async ({ chatId, sender, doctorId: clientDoctorId }) => {
        try {
          const roomName = `chat:${chatId}`;
          // Emit to chat room as before
          socket.to(roomName).emit("typing", { chatId, sender });

          // Try to get doctorId from (1) payload (trusted only if you validate), (2) cache, (3) DB
          let doctorId = clientDoctorId || cacheGetChatDoctor(chatId);
          if (!doctorId) {
            // Query DB once and cache
            const chat = await prisma.chat.findUnique({
              where: { id: chatId },
              select: { doctorId: true },
            });
            doctorId = chat?.doctorId;
            if (doctorId) cacheSetChatDoctor(chatId, doctorId);
          }

          if (doctorId) {
            ioInstance
              .to(`doctor:${doctorId}`)
              .emit("typing", { chatId, sender });
          }
        } catch (err) {
          console.error("❌ typing handler error:", err);
        }
      }
    );

    // ✅ User berhenti mengetik - emit to chat room AND doctor's room
    socket.on(
      "stop_typing",
      async ({ chatId, sender, doctorId: clientDoctorId }) => {
        try {
          const roomName = `chat:${chatId}`;
          socket.to(roomName).emit("stop_typing", { chatId, sender });

          let doctorId = clientDoctorId || cacheGetChatDoctor(chatId);
          if (!doctorId) {
            const chat = await prisma.chat.findUnique({
              where: { id: chatId },
              select: { doctorId: true },
            });
            doctorId = chat?.doctorId;
            if (doctorId) cacheSetChatDoctor(chatId, doctorId);
          }

          if (doctorId) {
            ioInstance
              .to(`doctor:${doctorId}`)
              .emit("stop_typing", { chatId, sender });
          }
        } catch (err) {
          console.error("❌ stop_typing handler error:", err);
        }
      }
    );

    // 👁️ Mark as read - MOVED: register once per connection
    socket.on("mark_as_read", async ({ chatId, userId, doctorId }) => {
      try {
        console.log(
          `👁️ Mark as read: chatId=${chatId}, userId=${userId}, doctorId=${doctorId}`
        );

        await prisma.chatUnread.updateMany({
          where: { chatId, OR: [{ userId }, { doctorId }] },
          data: { unreadCount: 0 },
        });

        const roomName = `chat:${chatId}`; // ✅ Consistent naming
        ioInstance.to(roomName).emit("update_unread", {
          chatId,
          userId,
          doctorId,
          unreadCount: 0,
        });

        console.log(`✅ Unread reset for chat ${chatId}`);
      } catch (err) {
        console.error("❌ Error mark_as_read:", err);
        socket.emit("error", {
          message: "Failed to mark as read: " + err.message,
        });
      }
    });

    // 💬 Send message (text / image / pdf) - with callback support
    socket.on("send_message", async (payload, callback) => {
      try {
        const { chatId, sender, content, type = "text", fileData } = payload;

        // ✅ Enhanced logging
        console.log(`📨 [send_message] Received:`, {
          chatId,
          sender,
          type,
          contentLength: content?.length || 0,
          hasFileData: !!fileData,
          socketId: socket.id,
          timestamp: new Date().toISOString(),
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
            chatKey: true, // ✅ Include chatKey
            isActive: true,
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

        try {
          if (sender === chat.userId) {
            // User kirim pesan → dokter penerima
            const unread = await prisma.chatUnread.upsert({
              where: {
                chatId_doctorId_userId: {
                  chatId: chat.id,
                  doctorId: chat.doctorId,
                  userId: null,
                },
              },
              update: { unreadCount: { increment: 1 } },
              create: {
                chatId: chat.id,
                doctorId: chat.doctorId,
                unreadCount: 1,
              },
              select: { unreadCount: true },
            });

            ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              doctorId: chat.doctorId,
              unreadCount: unread.unreadCount,
            });
          } else if (sender === chat.doctorId) {
            // Dokter kirim pesan → user penerima
            const unread = await prisma.chatUnread.upsert({
              where: {
                chatId_userId_doctorId: {
                  chatId: chat.id,
                  userId: chat.userId,
                  doctorId: null,
                },
              },
              update: { unreadCount: { increment: 1 } },
              create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
              select: { unreadCount: true },
            });

            ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              userId: chat.userId,
              unreadCount: unread.unreadCount,
            });
          }
        } catch (unreadErr) {
          console.error("❌ Failed to update unread count:", unreadErr);
        }

        // ✅ cache the doctorId for subsequent typing events
        if (chat?.doctorId) cacheSetChatDoctor(chat.id, chat.doctorId);

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
          id: savedMessage.id, // ✅ PRIMARY ID
          messageId: savedMessage.id, // ✅ BACKWARD COMPAT
          chatId: chat.id, // ✅ CHAT UUID
          chatDateId: chatDate.id, // ✅ REQUIRED BY CLIENT
          chatKey: chat.chatKey, // ✅ Include chatKey
          sender,
          type,
          content: finalContent,
          sentAt: savedMessage.sentAt,
          fileName: payload.fileName || payload.filename, // ✅ FILE METADATA
          fileUrl: type !== "text" ? finalContent : undefined, // ✅ MEDIA URL
          chatDate: { date: today.toISOString() }, // ✅ CLIENT COMPATIBILITY
        };

        const roomName = `chat:${chat.id}`; // ✅ CRITICAL: Consistent prefix
        const roomSize =
          ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
        console.log(`📢 [new_message] Broadcasting to ${roomName}:`, {
          messageId: savedMessage.id,
          type,
          sender,
          roomMembers: roomSize,
        });
        ioInstance.to(roomName).emit("new_message", messagePayload);
        console.log(`✅ Broadcast completed to ${roomSize} client(s)`);

        try {
          let newUnread;

          if (sender === chat.userId) {
            // user kirim pesan → dokter penerima
            newUnread = await prisma.chatUnread.upsert({
              where: {
                chatId_doctorId: { chatId: chat.id, doctorId: chat.doctorId },
              },
              update: { unreadCount: { increment: 1 } },
              create: {
                chatId: chat.id,
                doctorId: chat.doctorId,
                unreadCount: 1,
              },
              select: { unreadCount: true },
            });

            ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              doctorId: chat.doctorId,
              unreadCount: newUnread.unreadCount,
            });
          } else if (sender === chat.doctorId) {
            // dokter kirim pesan → user penerima
            newUnread = await prisma.chatUnread.upsert({
              where: {
                chatId_userId: { chatId: chat.id, userId: chat.userId },
              },
              update: { unreadCount: { increment: 1 } },
              create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
              select: { unreadCount: true },
            });

            ioInstance.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              userId: chat.userId,
              unreadCount: newUnread.unreadCount,
            });
          }
        } catch (unreadErr) {
          console.error("❌ Failed to update unread count:", unreadErr);
        }

        // ✅ Send success callback to sender
        if (callback) {
          callback({
            success: true,
            data: messagePayload,
          });
          console.log(
            `✅ [send_message] Callback sent: success=true, messageId=${savedMessage.id}`
          );
        } else {
          console.warn(`⚠️ [send_message] No callback function provided`);
        }
      } catch (err) {
        console.error("❌ [send_message] Error:", err.message ?? err);
        console.error("Stack:", err.stack ?? "(no stack)");
        const error = {
          message: "Internal server error: " + (err.message || String(err)),
        };
        socket.emit("error", error);
        // ✅ Always call callback on error
        if (callback) {
          callback({ success: false, error: err.message || String(err) });
          console.log(
            `❌ [send_message] Callback sent: success=false, error=${
              err.message || String(err)
            }`
          );
        }
      }
    });

    // 🚪 Leave room
    socket.on("leave_chat", (chatId) => {
      const roomName = `chat:${chatId}`; // ✅ CRITICAL: Consistent prefix
      socket.leave(roomName);
      const roomSize =
        ioInstance.sockets.adapter.rooms.get(roomName)?.size || 0;
      console.log(`🚪 ${socket.id} left ${roomName} (${roomSize} remaining)`);
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
