// controllers/chatController.js
// ✅ Final version — Simple chat controller (without consultationId)

// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// class ChatController {
//   // =======================================================
//   // 🔹 GET ALL CHATS (Smart version for both Doctor & User)
//   // =======================================================
//   async getAllChats(req, res) {
//     try {
//       if (!req.user) {
//         return res
//           .status(401)
//           .json({ success: false, message: "Unauthorized" });
//       }

//       const { id, type } = req.user;

//       // Tentukan filter
//       const where =
//         type === "doctor"
//           ? { doctorId: id }
//           : type === "user"
//           ? { userId: id }
//           : {};

//       // Ambil semua chat beserta relasi
//       const chats = await prisma.chat.findMany({
//         where,
//         include: {
//           user: { select: { id: true, fullname: true, photo: true } },
//           doctor: { select: { id: true, fullname: true, photo: true } },
//           lastMessage: {
//             select: {
//               id: true,
//               content: true,
//               sentAt: true,
//               sender: true,
//             },
//           },
//         },
//         orderBy: { updatedAt: "desc" },
//       });

//       // 🔹 Format supaya FE langsung bisa render tanpa tahu role
//       const formatted = chats.map((chat) => {
//         const partner = type === "doctor" ? chat.user : chat.doctor; // dokter lihat pasien, pasien lihat dokter

//         return {
//           id: chat.id,
//           chatKey: chat.chatKey,
//           displayName: partner.fullname,
//           photo: partner.photo,
//           partnerId: partner.id,
//           lastMessage: chat.lastMessage?.content || "Belum ada pesan",
//           lastMessageTime: chat.lastMessage?.sentAt || chat.updatedAt,
//         };
//       });

//       res.status(200).json({
//         success: true,
//         data: formatted,
//       });
//     } catch (error) {
//       console.error("❌ Error getAllChats:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch chats",
//         error: error.message,
//       });
//     }
//   }

//   // =======================================================
//   // 🔹 CREATE (or GET EXISTING) CHAT
//   // =======================================================
//   async createChat(req, res) {
//     try {
//       const { userId, doctorId, paymentId } = req.body;

//       if (!userId || !doctorId) {
//         return res.status(400).json({
//           success: false,
//           message: "userId and doctorId are required",
//         });
//       }

//       // Cari chat lama
//       let existingChat = await prisma.chat.findFirst({
//         where: { userId, doctorId },
//         include: { user: true, doctor: true },
//       });

//       if (existingChat) {
//         // update paymentId kalau perlu
//         if (paymentId) {
//           await prisma.chat.update({
//             where: { id: existingChat.id },
//             data: { paymentId },
//           });
//         }

//         return res.status(200).json({
//           success: true,
//           message: "Existing chat loaded",
//           data: existingChat,
//         });
//       }

//       // Buat baru
//       const chatKey = `${userId}-${doctorId}`;
//       const newChat = await prisma.chat.create({
//         data: {
//           userId,
//           doctorId,
//           paymentId,
//           chatKey,
//         },
//         include: { user: true, doctor: true },
//       });

//       res.status(201).json({
//         success: true,
//         message: "New chat created",
//         data: newChat,
//       });
//     } catch (error) {
//       console.error("❌ Error createChat:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to create or fetch chat",
//         error: error.message,
//       });
//     }
//   }

//   // =======================================================
//   // 🔹 GET MESSAGES BY CHATKEY
//   // =======================================================
//   async getMessages(req, res) {
//     try {
//       const { chatKey } = req.params;

//       const chat = await prisma.chat.findUnique({
//         where: { chatKey },
//         include: {
//           dates: {
//             orderBy: { date: "asc" },
//             include: {
//               messages: { orderBy: { sentAt: "asc" } },
//             },
//           },
//           user: true,
//           doctor: true,
//         },
//       });

//       if (!chat) {
//         return res.status(404).json({
//           success: false,
//           message: "Chat not found",
//         });
//       }

//       res.status(200).json({
//         success: true,
//         data: chat,
//       });
//     } catch (error) {
//       console.error("❌ Error getMessages:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch messages",
//         error: error.message,
//       });
//     }
//   }

//   // =======================================================
//   // 🔹 SEND MESSAGE
//   // =======================================================
//   async sendMessage(req, res) {
//     try {
//       const { chatKey } = req.params;
//       const { content } = req.body;
//       const { id, type } = req.user;

//       if (!content?.trim()) {
//         return res
//           .status(400)
//           .json({ success: false, message: "Content required" });
//       }

//       const chat = await prisma.chat.findUnique({
//         where: { chatKey },
//       });

//       if (!chat) {
//         return res.status(404).json({
//           success: false,
//           message: "Chat not found",
//         });
//       }

//       const today = new Date();
//       const startOfDay = new Date(today.setHours(0, 0, 0, 0));

//       let chatDate = await prisma.chatDate.findFirst({
//         where: {
//           chatId: chat.id,
//           date: { gte: startOfDay },
//         },
//       });

//       if (!chatDate) {
//         chatDate = await prisma.chatDate.create({
//           data: {
//             chatId: chat.id,
//             date: new Date(),
//           },
//         });
//       }

//       const message = await prisma.chatMessage.create({
//         data: {
//           chatDateId: chatDate.id,
//           sender: type,
//           content,
//         },
//       });

//       await prisma.chat.update({
//         where: { id: chat.id },
//         data: {
//           lastMessageId: message.id,
//           updatedAt: new Date(),
//         },
//       });

//       res.status(201).json({
//         success: true,
//         message: "Message sent successfully",
//         data: message,
//       });
//     } catch (error) {
//       console.error("❌ Error sendMessage:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to send message",
//         error: error.message,
//       });
//     }
//   }
// }

// module.exports = new ChatController();

// ✅ Kirim pesan baru
// async sendMessage(req, res) {
//   try {
//     const { chatKey } = req.params;
//     const { content } = req.body;
//     const { id, type } = req.user;

//     const chat = await prisma.chat.findUnique({ where: { chatKey } });
//     if (!chat) {
//       return res.status(404).json({
//         success: false,
//         message: "Chat not found",
//       });
//     }

//     const message = await prisma.chatMessage.create({
//       data: {
//         chatId: chat.id,
//         sender: type,
//         content,
//         userId: type === "user" ? id : null,
//         doctorId: type === "doctor" ? id : null,
//       },
//     });

//     await prisma.chat.update({
//       where: { id: chat.id },
//       data: {
//         lastMessageId: message.id,
//         updatedAt: new Date(),
//       },
//     });

//     res.status(201).json({
//       success: true,
//       message: "Message sent successfully",
//       data: message,
//     });
//   } catch (error) {
//     console.error("❌ Error sendMessage:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to send message",
//       error: error.message,
//     });
//   }
// }

// controllers/chatController.js
// ✅ Final version — Smart chat controller with 10-minute grace period

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ChatController {
  // =======================================================
  // 🔹 GET ALL CHATS (Smart version for both Doctor & User)
  // =======================================================
  async getAllChats(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { id, type } = req.user;

      // Tentukan filter berdasarkan role login
      const where =
        type === "doctor"
          ? { doctorId: id }
          : type === "user"
          ? { userId: id }
          : {};

      const chats = await prisma.chat.findMany({
        where,
        include: {
          user: { select: { id: true, fullname: true, photo: true } },
          doctor: { select: { id: true, fullname: true, photo: true } },
          lastMessage: {
            select: { id: true, content: true, sentAt: true, sender: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      // Format data agar FE tidak perlu tahu role
      const formatted = chats.map((chat) => {
        const partner = type === "doctor" ? chat.user : chat.doctor;
        return {
          id: chat.id,
          chatKey: chat.chatKey,
          displayName: partner.fullname,
          photo: partner.photo,
          partnerId: partner.id,
          lastMessage: chat.lastMessage?.content || "Belum ada pesan",
          lastMessageTime: chat.lastMessage?.sentAt || chat.updatedAt,
        };
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      console.error("❌ Error getAllChats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chats",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 🔹 CREATE (or GET EXISTING) CHAT - with 10min grace period
  // =======================================================
  async createChat(req, res) {
    try {
      const { userId, doctorId, paymentId } = req.body;

      if (!userId || !doctorId) {
        return res.status(400).json({
          success: false,
          message: "userId and doctorId are required",
        });
      }

      // 1️⃣ Cek apakah chat sudah ada
      let existingChat = await prisma.chat.findFirst({
        where: { userId, doctorId },
        include: { user: true, doctor: true, payment: true },
      });

      if (existingChat) {
        // Perbarui paymentId kalau dikirim
        if (paymentId) {
          await prisma.chat.update({
            where: { id: existingChat.id },
            data: { paymentId },
          });
        }

        return res.status(200).json({
          success: true,
          message: "Existing chat loaded",
          data: existingChat,
        });
      }

      // 2️⃣ Cek pembayaran terakhir user ke dokter ini
      const recentPayment = await prisma.payment.findFirst({
        where: {
          userId,
          doctorId,
          status: "success",
        },
        orderBy: { createdAt: "desc" },
      });

      // Kalau belum pernah bayar sama sekali
      if (!recentPayment) {
        return res.status(403).json({
          success: false,
          message: "No successful payment found",
        });
      }

      // 3️⃣ Hitung waktu selisih dari pembayaran
      const now = new Date();
      const paymentTime = new Date(recentPayment.createdAt);
      const diffMs = now - paymentTime;
      const tenMinutes = 10 * 60 * 1000; // 10 menit dalam ms

      // 4️⃣ Kalau sudah lewat 10 menit, tolak
      if (diffMs > tenMinutes) {
        return res.status(403).json({
          success: false,
          message: "Payment expired — please pay again",
        });
      }

      // 5️⃣ Kalau masih dalam masa aktif, buat chat baru
      const chatKey = `${userId}-${doctorId}`;
      const newChat = await prisma.chat.create({
        data: {
          userId,
          doctorId,
          paymentId: recentPayment.id,
          chatKey,
        },
        include: { user: true, doctor: true, payment: true },
      });

      res.status(201).json({
        success: true,
        message: "New chat created (within 10-minute access window)",
        data: newChat,
      });
    } catch (error) {
      console.error("❌ Error createChat:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create or fetch chat",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 🔹 GET MESSAGES BY CHATKEY
  // =======================================================
  async getMessages(req, res) {
    try {
      const { chatKey } = req.params;

      const chat = await prisma.chat.findUnique({
        where: { chatKey },
        include: {
          dates: {
            orderBy: { date: "asc" },
            include: {
              messages: { orderBy: { sentAt: "asc" } },
            },
          },
          user: true,
          doctor: true,
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      res.status(200).json({
        success: true,
        data: chat,
      });
    } catch (error) {
      console.error("❌ Error getMessages:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
        error: error.message,
      });
    }
  }

  // =======================================================
  // 🔹 SEND MESSAGE
  // =======================================================
  async sendMessage(req, res) {
    try {
      const { chatKey } = req.params;
      const { content } = req.body;
      const { id, type } = req.user;

      if (!content?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Content required" });
      }

      const chat = await prisma.chat.findUnique({ where: { chatKey } });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      // Cari atau buat ChatDate untuk hari ini
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      let chatDate = await prisma.chatDate.findFirst({
        where: {
          chatId: chat.id,
          date: { gte: startOfDay },
        },
      });

      if (!chatDate) {
        chatDate = await prisma.chatDate.create({
          data: {
            chatId: chat.id,
            date: new Date(),
          },
        });
      }

      // Buat pesan baru
      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: type,
          content,
        },
      });

      // Update lastMessageId di Chat
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message,
      });
    } catch (error) {
      console.error("❌ Error sendMessage:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send message",
        error: error.message,
      });
    }
  }
}

module.exports = new ChatController();
