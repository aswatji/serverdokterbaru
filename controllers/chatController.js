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

// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

// class ChatController {
//   // =======================================================
//   // 🔹 GET ALL CHATS (Smart version for both Doctor & User)
//   // =======================================================
//   async getAllChats(req, res) {
//     try {
//       if (!req.user) {
//         return res.status(401).json({
//           success: false,
//           message: "Unauthorized",
//         });
//       }

//       const { id, type } = req.user;

//       // Tentukan filter berdasarkan role login
//       const where =
//         type === "doctor"
//           ? { doctorId: id }
//           : type === "user"
//           ? { userId: id }
//           : {};

//       const chats = await prisma.chat.findMany({
//         where,
//         include: {
//           user: { select: { id: true, fullname: true, photo: true } },
//           doctor: { select: { id: true, fullname: true, photo: true } },
//           lastMessage: {
//             select: { id: true, content: true, sentAt: true, sender: true },
//           },
//         },
//         orderBy: { updatedAt: "desc" },
//       });

//       // Format data agar FE tidak perlu tahu role
//       const formatted = chats.map((chat) => {
//         const partner = type === "doctor" ? chat.user : chat.doctor;
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
//   // 🔹 CREATE (or GET EXISTING) CHAT - with 10min grace period
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

//       // 🔹 Cari chat yang sudah ada (1 pasien 1 dokter)
//       let chat = await prisma.chat.findFirst({
//         where: { userId, doctorId },
//         include: { user: true, doctor: true, payment: true },
//       });

//       // 🔹 Ambil payment terakhir yang sukses
//       const recentPayment = await prisma.payment.findFirst({
//         where: {
//           userId,
//           doctorId,
//           status: "success",
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       if (!recentPayment) {
//         return res.status(403).json({
//           success: false,
//           message: "Belum ada pembayaran sukses untuk dokter ini.",
//         });
//       }

//       const now = new Date();
//       const paymentTime = new Date(recentPayment.createdAt);
//       const diffMs = now - paymentTime;
//       const tenMinutes = 10 * 60 * 1000;

//       // 🔹 Kalau payment masih berlaku
//       if (diffMs <= tenMinutes) {
//         if (chat) {
//           // 🔄 Update chat dengan paymentId terbaru (biar bisa lanjut chat)
//           await prisma.chat.update({
//             where: { id: chat.id },
//             data: {
//               paymentId: recentPayment.id,
//               updatedAt: new Date(),
//             },
//           });
//           const updatedChat = await prisma.chat.findUnique({
//             where: { id: chat.id },
//             include: { user: true, doctor: true, payment: true },
//           });
//           return res.status(200).json({
//             success: true,
//             message: "Chat diperbarui dengan pembayaran baru",
//             data: updatedChat,
//           });
//         }

//         // 🆕 Kalau belum ada chat, buat baru
//         const chatKey = `${userId}-${doctorId}`;
//         const newChat = await prisma.chat.create({
//           data: {
//             userId,
//             doctorId,
//             paymentId: recentPayment.id,
//             chatKey,
//           },
//           include: { user: true, doctor: true, payment: true },
//         });

//         return res.status(201).json({
//           success: true,
//           message: "Chat baru dibuat (pembayaran valid)",
//           data: newChat,
//         });
//       }

//       // 🔒 Kalau payment sudah lewat 10 menit
//       return res.status(403).json({
//         success: false,
//         message: "Payment expired — silakan bayar lagi untuk mulai chat.",
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
//   // async getMessages(req, res) {
//   //   try {
//   //     const { chatKey } = req.params;

//   //     const chat = await prisma.chat.findUnique({
//   //       where: { chatKey },
//   //       include: {
//   //         dates: {
//   //           orderBy: { date: "asc" },
//   //           include: {
//   //             messages: {
//   //               orderBy: { sentAt: "asc" },
//   //               select: { id, chatDateId, sender, content, sentAt },
//   //             },
//   //           },
//   //         },
//   //         user: true,
//   //         doctor: true,
//   //       },
//   //     });

//   //     if (!chat) {
//   //       return res.status(404).json({
//   //         success: false,
//   //         message: "Chat not found",
//   //       });
//   //     }

//   //     res.status(200).json({
//   //       success: true,
//   //       data: chat,
//   //     });
//   //   } catch (error) {
//   //     console.error("❌ Error getMessages:", error);
//   //     res.status(500).json({
//   //       success: false,
//   //       message: "Failed to fetch messages",
//   //       error: error.message,
//   //     });
//   //   }
//   // }

//   async getMessages(req, res) {
//     try {
//       const { chatKey } = req.params;

//       const chat = await prisma.chat.findUnique({
//         where: { chatKey },
//         include: {
//           dates: {
//             // ✅ gunakan nama relasi yang benar sesuai schema
//             orderBy: { date: "asc" },
//             include: {
//               messages: {
//                 orderBy: { sentAt: "asc" },
//                 select: {
//                   id: true,
//                   sender: true,
//                   content: true,
//                   sentAt: true,
//                 },
//               },
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

//       // 🔹 Format output agar frontend bisa langsung konsumsi
//       const formatted = {
//         chatKey: chat.chatKey,
//         user: chat.user,
//         doctor: chat.doctor,
//         dates: chat.dates.map((d) => ({
//           date: d.date,
//           messages: d.messages.map((m) => ({
//             id: m.id,
//             sender: m.sender,
//             content: m.content,
//             sentAt: m.sentAt,
//           })),
//         })),
//       };

//       res.status(200).json({
//         success: true,
//         data: formatted,
//       });
//     } catch (error) {
//       console.error("❌ Error getMessages:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch messages",
//         error: error.message,
//       });
//     }
//   } // =======================================================
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

//       const chat = await prisma.chat.findUnique({ where: { chatKey } });
//       if (!chat) {
//         return res.status(404).json({
//           success: false,
//           message: "Chat not found",
//         });
//       }

//       // Cari atau buat ChatDate untuk hari ini
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

//       // Buat pesan baru
//       const message = await prisma.chatMessage.create({
//         data: {
//           chatDateId: chatDate.id,
//           sender: type,
//           content,
//         },
//       });

//       // Update lastMessageId di Chat
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

// controllers/chatController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { getIO } = require("../chatSocket"); // 🔥 tambahkan ini agar bisa broadcast realtime

class ChatController {
  // =======================================================
  // 🔹 GET ALL CHATS (untuk Doctor & User)
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
  // 🔹 CREATE (or GET EXISTING) CHAT — with 10 min grace period
  // =======================================================
  async createChat(req, res) {
    try {
      const { userId, doctorId } = req.body;

      if (!userId || !doctorId) {
        return res.status(400).json({
          success: false,
          message: "userId and doctorId are required",
        });
      }

      let chat = await prisma.chat.findFirst({
        where: { userId, doctorId },
        include: { user: true, doctor: true, payment: true },
      });

      const recentPayment = await prisma.payment.findFirst({
        where: { userId, doctorId, status: "success" },
        orderBy: { createdAt: "desc" },
      });

      if (!recentPayment) {
        return res.status(403).json({
          success: false,
          message: "Belum ada pembayaran sukses untuk dokter ini.",
        });
      }

      const now = new Date();
      const paymentTime = new Date(recentPayment.createdAt);
      const diffMs = now - paymentTime;
      const tenMinutes = 10 * 60 * 1000;

      if (diffMs <= tenMinutes) {
        if (chat) {
          await prisma.chat.update({
            where: { id: chat.id },
            data: {
              paymentId: recentPayment.id,
              updatedAt: new Date(),
            },
          });

          const updatedChat = await prisma.chat.findUnique({
            where: { id: chat.id },
            include: { user: true, doctor: true, payment: true },
          });

          return res.status(200).json({
            success: true,
            message: "Chat diperbarui dengan pembayaran baru",
            data: updatedChat,
          });
        }

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

        return res.status(201).json({
          success: true,
          message: "Chat baru dibuat (pembayaran valid)",
          data: newChat,
        });
      }

      return res.status(403).json({
        success: false,
        message: "Payment expired — silakan bayar lagi untuk mulai chat.",
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
              messages: {
                orderBy: { sentAt: "asc" },
                select: {
                  id: true,
                  sender: true,
                  content: true,
                  sentAt: true,
                },
              },
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

      const formatted = {
        chatKey: chat.chatKey,
        user: chat.user,
        doctor: chat.doctor,
        dates: chat.chatDates.map((d) => ({
          date: d.date,
          messages: d.messages,
        })),
      };

      res.status(200).json({
        success: true,
        data: formatted,
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
  // 🔹 SEND MESSAGE (Realtime + Save to DB)
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

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      let chatDate = await prisma.chatDate.findFirst({
        where: {
          chatId: chat.id,
          date: { gte: startOfDay, lte: endOfDay },
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

      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: type,
          content,
        },
      });

      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      // ✅ Kirim realtime event ke semua yang join room ini
      try {
        const io = getIO();
        const roomName = `chat:${chat.id}`;
        io.to(roomName).emit("new_message", {
          messageId: message.id,
          chatId: chat.id,
          sender: message.sender,
          content: message.content,
          sentAt: message.sentAt,
        });
        console.log(`📡 Broadcast new message to ${roomName}`);
      } catch (err) {
        console.warn("⚠️ Socket.IO not initialized yet:", err.message);
      }

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
