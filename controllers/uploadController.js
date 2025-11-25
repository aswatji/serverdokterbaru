// import crypto from "crypto";
// import { PrismaClient } from "@prisma/client";
// import { uploadToMinio } from "../utils/minioUpload.js";

// const prisma = new PrismaClient();

// class UploadController {
//   constructor(io) {
//     this.io = io; // simpan instance socket.io
//   }

//   /**
//    * @route POST /upload
//    * @desc Upload file (image/pdf) dan simpan ke ChatMessage + kirim ke socket
//    */
//   async uploadFile(req, res) {
//     try {
//       const file = req.file;
//       const { chatDateId, sender } = req.body;

//       if (!file) return res.status(400).json({ error: "File tidak ditemukan" });
//       if (!chatDateId || !sender)
//         return res
//           .status(400)
//           .json({ error: "chatDateId dan sender wajib diisi" });

//       // Validasi tipe file
//       const allowed = ["image/jpeg", "image/png", "application/pdf"];
//       if (!allowed.includes(file.mimetype))
//         return res.status(400).json({ error: "Tipe file tidak didukung" });

//       // Generate nama file unik
//       const ext =
//         file.mimetype === "application/pdf"
//           ? ".pdf"
//           : file.mimetype === "image/png"
//           ? ".png"
//           : ".jpg";
//       const fileName = `${crypto.randomBytes(8).toString("hex")}${ext}`;

//       // Upload ke MinIO
//       const fileUrl = await uploadToMinio(
//         process.env.MINIO_BUCKET || "uploads",
//         fileName,
//         file.buffer,
//         file.mimetype
//       );

//       // Tentukan tipe pesan
//       const type = file.mimetype === "application/pdf" ? "pdf" : "image";

//       // Simpan ke Prisma
//       const message = await prisma.chatMessage.create({
//         data: {
//           chatDateId,
//           sender,
//           content: fileUrl,
//           type,
//         },
//       });

//       // Broadcast ke semua client
//       this.io.to(chatDateId).emit("new_message", message);

//       return res.status(200).json({
//         ok: true,
//         message: "Upload berhasil",
//         data: message,
//       });
//     } catch (err) {
//       console.error("Upload Error:", err);
//       return res.status(500).json({ error: "Upload gagal" });
//     }
//   }

//   /**
//    * @route GET /upload/:chatDateId
//    * @desc Ambil semua pesan untuk satu chatDate
//    */
//   async getMessages(req, res) {
//     try {
//       const { chatDateId } = req.params;
//       const messages = await prisma.chatMessage.findMany({
//         where: { chatDateId },
//         orderBy: { sentAt: "asc" },
//       });

//       return res.json({ ok: true, messages });
//     } catch (err) {
//       console.error("Get messages error:", err);
//       return res.status(500).json({ error: "Gagal mengambil pesan" });
//     }
//   }
// }

// export default UploadController;

import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import minioService from "../service/minioService.js";

const prisma = new PrismaClient();

class UploadController {
  /**
   * @desc Upload file via HTTP POST, save to DB, broadcast via Socket.IO
   * @route POST /api/upload
   */
  static async uploadFile(req, res) {
    try {
      const file = req.file;
      const { chatId, sender } = req.body;

      console.log("📤 Upload request:", { chatId, sender, hasFile: !!file });

      // Validation
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File tidak ditemukan",
        });
      }

      if (!chatId || !sender) {
        return res.status(400).json({
          success: false,
          message: "chatId dan sender wajib diisi",
        });
      }

      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/pdf",
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "Tipe file tidak didukung. Hanya jpg, png, dan pdf yang diizinkan",
        });
      }

      // Check file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "Ukuran file maksimal 5MB",
        });
      }

      // Get chat info
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          chatKey: true,
          isActive: true,
          userId: true,
          doctorId: true,
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: `Chat tidak ditemukan: ${chatId}`,
        });
      }

      if (!chat.isActive) {
        return res.status(403).json({
          success: false,
          message: "Chat tidak aktif",
        });
      }

      // Determine file type
      const type = file.mimetype === "application/pdf" ? "pdf" : "image";

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = crypto.randomBytes(4).toString("hex");
      const ext = file.originalname.split(".").pop();
      const fileName = `${timestamp}-${randomStr}.${ext}`;
      const objectName = `chat/${chatId}/${fileName}`;

      console.log(`📤 Uploading ${type} to MinIO: ${objectName}`);

      // Upload to MinIO
      const uploadResult = await minioService.uploadFile(
        file.buffer,
        objectName,
        file.mimetype
      );
      const fileUrl = uploadResult.url;

      console.log(`✅ File uploaded to MinIO: ${fileUrl}`);

      // Get or create ChatDate for today
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

      // Save message to database
      const savedMessage = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender,
          content: fileUrl,
          type,
        },
      });

      console.log(`✅ Message saved to DB: ${savedMessage.id}`);

      // Update chat lastMessage
      await prisma.chat.update({
        where: { id: chat.id },
        data: {
          lastMessageId: savedMessage.id,
          updatedAt: new Date(),
        },
      });

      // Update unread count
      try {
        if (sender === chat.userId) {
          const unread = await prisma.chatUnread.upsert({
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

          // Broadcast unread count via Socket.IO
          const io = req.app.get("io");
          if (io) {
            io.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              doctorId: chat.doctorId,
              unreadCount: unread.unreadCount,
            });
          }
        } else if (sender === chat.doctorId) {
          const unread = await prisma.chatUnread.upsert({
            where: {
              chatId_userId: { chatId: chat.id, userId: chat.userId },
            },
            update: { unreadCount: { increment: 1 } },
            create: { chatId: chat.id, userId: chat.userId, unreadCount: 1 },
            select: { unreadCount: true },
          });

          // Broadcast unread count via Socket.IO
          const io = req.app.get("io");
          if (io) {
            io.to(`chat:${chat.id}`).emit("update_unread", {
              chatId: chat.id,
              userId: chat.userId,
              unreadCount: unread.unreadCount,
            });
          }
        }
      } catch (unreadErr) {
        console.error("❌ Failed to update unread count:", unreadErr);
      }

      // Prepare message payload
      const messagePayload = {
        id: savedMessage.id,
        messageId: savedMessage.id,
        chatId: chat.id,
        chatDateId: chatDate.id,
        chatKey: chat.chatKey,
        sender,
        type,
        content: fileUrl,
        sentAt: savedMessage.sentAt,
        fileName: file.originalname,
        fileSize: file.size,
        fileUrl: fileUrl,
        mimeType: file.mimetype,
        chatDate: { date: today.toISOString() },
      };

      // Broadcast to Socket.IO room
      const io = req.app.get("io");
      if (io) {
        const roomName = `chat:${chat.id}`;
        io.to(roomName).emit("new_message", messagePayload);
        console.log(`📢 Broadcast new_message to ${roomName}`);
        console.log(`   ├─ Message ID: ${savedMessage.id}`);
        console.log(`   ├─ Type: ${type}`);
        console.log(`   └─ File: ${file.originalname}`);
      } else {
        console.warn("⚠️ Socket.IO instance not found in app");
      }

      // Return success response
      return res.status(200).json({
        success: true,
        message: "File berhasil diupload",
        data: messagePayload,
      });
    } catch (err) {
      console.error("❌ Upload error:", err);
      return res.status(500).json({
        success: false,
        message: "Upload gagal",
        error: err.message,
      });
    }
  }

  /**
   * @desc Upload multiple files at once
   * @route POST /api/upload/multiple
   */
  static async uploadMultiple(req, res) {
    try {
      const files = req.files;
      const { chatId, sender } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada file yang diupload",
        });
      }

      if (!chatId || !sender) {
        return res.status(400).json({
          success: false,
          message: "chatId dan sender wajib diisi",
        });
      }

      const uploadResults = [];

      for (const file of files) {
        try {
          // Validate file type
          const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "application/pdf",
          ];

          if (!allowedTypes.includes(file.mimetype)) {
            uploadResults.push({
              fileName: file.originalname,
              success: false,
              error: "Tipe file tidak didukung",
            });
            continue;
          }

          // Check file size
          if (file.size > 5 * 1024 * 1024) {
            uploadResults.push({
              fileName: file.originalname,
              success: false,
              error: "Ukuran file maksimal 5MB",
            });
            continue;
          }

          // Upload logic (same as single upload)
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            select: { id: true, chatKey: true, isActive: true },
          });

          if (!chat || !chat.isActive) {
            uploadResults.push({
              fileName: file.originalname,
              success: false,
              error: "Chat tidak valid atau tidak aktif",
            });
            continue;
          }

          const type = file.mimetype === "application/pdf" ? "pdf" : "image";
          const timestamp = Date.now();
          const randomStr = crypto.randomBytes(4).toString("hex");
          const ext = file.originalname.split(".").pop();
          const fileName = `${timestamp}-${randomStr}.${ext}`;
          const objectName = `chat/${chatId}/${fileName}`;

          const uploadResult = await minioService.uploadFile(
            file.buffer,
            objectName,
            file.mimetype
          );
          const fileUrl = uploadResult.url;

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const chatDate = await prisma.chatDate.upsert({
            where: { chatId_date: { chatId: chat.id, date: today } },
            update: {},
            create: { chatId: chat.id, date: today },
            select: { id: true },
          });

          const savedMessage = await prisma.chatMessage.create({
            data: {
              chatDateId: chatDate.id,
              sender,
              content: fileUrl,
              type,
            },
          });

          const messagePayload = {
            id: savedMessage.id,
            fileName: file.originalname,
            fileUrl: fileUrl,
            type,
            sentAt: savedMessage.sentAt,
          };

          // Broadcast via Socket.IO
          const io = req.app.get("io");
          if (io) {
            io.to(`chat:${chat.id}`).emit("new_message", messagePayload);
          }

          uploadResults.push({
            fileName: file.originalname,
            success: true,
            data: messagePayload,
          });
        } catch (fileErr) {
          uploadResults.push({
            fileName: file.originalname,
            success: false,
            error: fileErr.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `${uploadResults.filter((r) => r.success).length} dari ${files.length} file berhasil diupload`,
        results: uploadResults,
      });
    } catch (err) {
      console.error("❌ Multiple upload error:", err);
      return res.status(500).json({
        success: false,
        message: "Upload gagal",
        error: err.message,
      });
    }
  }
}

export default UploadController;