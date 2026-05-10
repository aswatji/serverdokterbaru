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
    
    socket.on("send_message", async (payload, callback) => {
      try {
        // ✅ 1. Tambahkan 'replyToId' di sini
        const {
          chatId,
          sender,
          content,
          type = "text",
          fileData,
          replyToId,
        } = payload;

        if (!chatId || !sender || (!content && !fileData)) {
          if (callback) callback({ success: false, error: "Data incomplete" });
          return;
        }

        // --- (Bagian ambil Chat & Upsert ChatDate TETAP SAMA) ---
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chatDate = await prisma.chatDate.upsert({
          where: { chatId_date: { chatId: chat.id, date: today } },
          update: {},
          create: { chatId: chat.id, date: today },
          select: { id: true },
        });

        // ✅ 2. Ubah query Create Message
        const savedMessage = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: sender,
            content,
            type,
            isRead: false,
            replyToId: replyToId ? replyToId : null,
          },
          // Sertakan data pesan induknya
          include: {
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: true,
                type: true,
              },
            },
          },
        });

        // Update Chat Last Message (Tetap sama)
        await prisma.chat.update({
          where: { id: chat.id },
          data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
        });

        // ✅ 3. Update Broadcast Payload
        // Masukkan data 'replyTo' ke dalam payload socket
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

          // Kirim data reply ke frontend (PENTING UNTUK UI)
          replyTo: savedMessage.replyTo,
        };

        const roomName = `chat:${chat.id}`;
        ioInstance.to(roomName).emit("new_message", messagePayload);
        console.log(`📢 Broadcast text to ${roomName} (Sender: ${sender})`);

        // --- (Bagian Unread Logic & Push Notification TETAP SAMA di bawah ini) ---
        // ... Copy logic unread & notifikasi Anda yang lama di sini ...

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

        if (callback) callback({ success: true, data: messagePayload });

        // Push Notification Logic (Sama seperti kode asli Anda)
        // ... di dalam socket.on("send_message") ...

        // ==========================================================
        // 🔥 KIRIM PUSH NOTIFICATION
        // ==========================================================
        setImmediate(async () => {
          try {
            const isSenderUser = sender === "user";
            const receiver = isSenderUser ? chat.doctor : chat.user;
            const senderName = isSenderUser
              ? chat.user.fullname
              : chat.doctor.fullname;

            if (receiver && receiver.pushToken) {
              let notifBody = "";

              // 1. Cek Tipe Pesan (Gambar/File)
              if (type === "image") {
                notifBody = "📷 Mengirim sebuah foto";
              } else if (type === "file" || type === "document") {
                notifBody = "📎 Mengirim sebuah dokumen";
              }
              // 2. Cek Jika Content adalah JSON (Resep / Catatan)
              else {
                // Default anggap teks biasa
                notifBody = content;

                // Cek apakah string dimulai dengan kurung kurawal (tanda JSON)
                if (
                  typeof content === "string" &&
                  content.startsWith("{") &&
                  content.endsWith("}")
                ) {
                  try {
                    const parsed = JSON.parse(content);
                    if (
                      parsed.type === "prescription" ||
                      parsed.title === "Resep Digital"
                    ) {
                      notifBody = "📄 Resep Digital Baru";
                    } else if (parsed.type === "medical_note") {
                      notifBody = "📝 Catatan Dokter Baru";
                    }
                  } catch (e) {
                    // Abaikan error parsing, lanjut sebagai text biasa
                  }
                }

                // Truncate jika teks biasa kepanjangan (dan bukan resep yg sudah diubah teksnya)
                if (notifBody === content && content.length > 50) {
                  notifBody = content.substring(0, 50) + "...";
                }
              }

              // 3. Kirim Notifikasi
              await sendPushNotification(
                receiver.pushToken,
                senderName || "Pesan Baru", // Title
                notifBody, // Body (yang sudah kita ubah jadi "Resep Digital")
                { screen: "chat", chatId: chat.id, chatKey: chat.chatKey }, // Data
              );

              console.log(
                `🔔 Notif sent to ${receiver.fullname}: ${notifBody}`,
              );
            }
          } catch (notifErr) {
            console.error("❌ Notif Error:", notifErr);
          }
        });
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
