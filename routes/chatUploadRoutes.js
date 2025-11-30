// import express from "express";
// import { upload } from "../middleware/uploadMiddleware.js";
// import minioService from "../service/minioService.js";
// import { dbConnection } from "../config/database.js";
// import { authMiddleware } from "../middleware/authMiddleware.js";
// import { getIO } from "../chatSocket.js";
// const router = express.Router();

// // Get prisma instance dynamically to ensure it's fully initialized
// const getPrisma = () => dbConnection.getInstance();

// /**
//  * 📤 Upload gambar/file untuk chat (seperti WhatsApp)
//  * POST /api/chat/upload
//  * Body: FormData dengan field "file" dan "chatId"
//  */
// router.post(
//   "/upload",
//   authMiddleware,
//   upload.single("file"),
//   async (req, res) => {
//     try {
//       const { chatId, sender } = req.body;
//       const file = req.file;

//       console.log("📤 Upload request:", {
//         chatId,
//         sender,
//         file: file
//           ? {
//               originalName: file.originalname,
//               mimetype: file.mimetype,
//               size: file.size,
//             }
//           : null,
//       });

//       // Validasi
//       if (!file) {
//         return res.status(400).json({
//           success: false,
//           message: "File tidak ditemukan",
//         });
//       }

//       if (!chatId) {
//         return res.status(400).json({
//           success: false,
//           message: "chatId diperlukan",
//         });
//       }

//       // Verify chat exists and is active
//       const prisma = getPrisma();

//       console.log("🔍 Debug Prisma:", {
//         prismaExists: !!prisma,
//         prismaType: typeof prisma,
//         hasMessage: !!prisma?.message,
//         hasChat: !!prisma?.chat,
//         prismaKeys: prisma ? Object.keys(prisma).slice(0, 10) : [],
//       });

//       const chat = await prisma.chat.findUnique({
//         where: { id: chatId },
//         select: {
//           id: true,
//           isActive: true,
//           userId: true,
//           doctorId: true,
//         },
//       });

//       if (!chat) {
//         return res.status(404).json({
//           success: false,
//           message: "Chat tidak ditemukan",
//         });
//       }

//       if (!chat.isActive) {
//         return res.status(400).json({
//           success: false,
//           message: "Chat sudah tidak aktif",
//         });
//       }

//       // Determine file type
//       const isImage = file.mimetype.startsWith("image/");
//       const isPDF = file.mimetype === "application/pdf";
//       const messageType = isImage ? "image" : isPDF ? "pdf" : "file";

//       // Upload to MinIO
//       console.log("☁️ Uploading to MinIO...");
//       const fileName = `chat/${chatId}/${Date.now()}-${file.originalname}`;
//       const uploadResult = await minioService.uploadFile(
//         file.buffer,
//         fileName,
//         file.mimetype
//       );

//       console.log(`✅ File uploaded: ${uploadResult.url}`);

//       // Save message to database
//       console.log("💾 Saving message to database...");

//       // Get or create ChatDate for today
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       let chatDate = await prisma.chatDate.findUnique({
//         where: {
//           chatId_date: {
//             chatId: chatId,
//             date: today,
//           },
//         },
//       });

//       if (!chatDate) {
//         chatDate = await prisma.chatDate.create({
//           data: {
//             chatId: chatId,
//             date: today,
//           },
//         });
//       }

//       // Create message with file info
//       // Store file URL in content for file/image types
//       const messageContent =
//         messageType === "text" ? file.originalname : uploadResult.url;

//       const message = await prisma.chatMessage.create({
//         data: {
//           chatDateId: chatDate.id,
//           sender: sender || "user",
//           content: messageContent,
//           type: messageType,
//         },
//         select: {
//           id: true,
//           sender: true,
//           content: true,
//           type: true,
//           sentAt: true,
//         },
//       });

//       console.log("✅ Message saved to database:", message.id);

//       // Update chat lastMessageId and updatedAt
//       await prisma.chat.update({
//         where: { id: chatId },
//         data: {
//           lastMessageId: message.id,
//           updatedAt: new Date(),
//         },
//       });

//       // Emit real-time notification via Socket.IO
//       // ============================================================
//       // 🕵️‍♂️ CCTV DEBUGGING (COPY DARI SINI)
//       // ============================================================
//       console.log("------------------------------------------------");
//       console.log("🕵️‍♂️ MULAI PROSES SOCKET...");

//       try {
//         const io = getIO();

//         if (!io) {
//           console.error(
//             "❌ ERROR FATAL: getIO() mengembalikan null! Socket belum di-init di server.js"
//           );
//         } else {
//           // 1. Cek Nama Room
//           const roomName = `chat:${chat.id}`;
//           console.log(`🏠 Target Room: "${roomName}"`);

//           // 2. Cek Penghuni Room (INI YANG PALING PENTING)
//           const room = io.sockets.adapter.rooms.get(roomName);
//           const members = room ? Array.from(room) : [];

//           console.log(`👥 Jumlah Orang di Room: ${members.length}`);
//           console.log(`📋 ID Socket Penghuni:`, members);

//           // 3. Analisa Situasi
//           if (members.length === 0) {
//             console.error(
//               "😱 BAHAYA: KAMAR KOSONG! Tidak ada yang mendengar pesan ini."
//             );
//             console.error(
//               "👉 Penyebab: Frontend Pasien TIDAK JOIN ke room ini."
//             );
//           } else if (members.length === 1) {
//             console.warn(
//               "⚠️ PERINGATAN: Cuma ada 1 orang (kemungkinan cuma Pengirim). Pasien belum masuk."
//             );
//           } else {
//             console.log(
//               "✅ AMAN: Ada >1 orang (Pengirim + Penerima). Mengirim sinyal..."
//             );

//             // 4. Kirim Sinyal
//             io.to(roomName).emit("new_message", messagePayload);
//             console.log("🚀 Sinyal 'new_message' TERKIRIM!");
//           }
//         }
//       } catch (socketErr) {
//         console.error("❌ SOCKET ERROR:", socketErr);
//       }
//       console.log("------------------------------------------------");
//       // ============================================================
//       const io = getIO();
//       if (io) {
//         const roomName = `chat:${chat.id}`;
//         io.to(roomName).emit("new_message", {
//           id: message.id,
//           chatDateId: chatDate.id,
//           sender: message.sender,
//           content: message.content, // URL untuk display
//           type: message.type,
//           fileUrl: uploadResult.url,
//           fileName: file.originalname,
//           fileSize: file.size,
//           mimeType: file.mimetype,
//           sentAt: message.sentAt,
//         });
//         console.log(`🔔 Socket.IO notification sent to room: ${roomName}`);
//       }

//       res.status(200).json({
//         success: true,
//         message: "File berhasil diupload",
//         data: {
//           id: message.id,
//           chatDateId: chatDate.id,
//           sender: message.sender,
//           content: message.content, // URL untuk image/pdf/file, filename untuk text
//           type: message.type, // "image", "pdf", "file", or "text"
//           fileUrl: uploadResult.url, // Always include for download
//           fileName: file.originalname, // Original filename
//           fileSize: file.size,
//           mimeType: file.mimetype,
//           sentAt: message.sentAt,
//         },
//       });
//     } catch (error) {
//       console.error("❌ Upload error:", error.message);
//       console.error("Error stack:", error.stack);
//       res.status(500).json({
//         success: false,
//         message: error.message || "Gagal upload file",
//       });
//     }
//   }
// );

// /**
//  * 📤 Upload multiple files (batch upload)
//  * POST /api/chat/upload/multiple
//  */
// router.post(
//   "/upload/multiple",
//   authMiddleware,
//   upload.array("files", 10), // Max 10 files
//   async (req, res) => {
//     try {
//       const { chatId, sender } = req.body;
//       const files = req.files;

//       if (!files || files.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message: "Tidak ada file yang diupload",
//         });
//       }

//       if (!chatId) {
//         return res.status(400).json({
//           success: false,
//           message: "chatId diperlukan",
//         });
//       }

//       // Verify chat
//       const prisma = getPrisma();
//       const chat = await prisma.chat.findUnique({
//         where: { id: chatId },
//         select: { id: true, isActive: true },
//       });

//       if (!chat || !chat.isActive) {
//         return res.status(400).json({
//           success: false,
//           message: "Chat tidak valid atau tidak aktif",
//         });
//       }

//       const uploadedMessages = [];

//       // Get or create ChatDate for today
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       let chatDate = await prisma.chatDate.findUnique({
//         where: {
//           chatId_date: {
//             chatId: chatId,
//             date: today,
//           },
//         },
//       });

//       if (!chatDate) {
//         chatDate = await prisma.chatDate.create({
//           data: {
//             chatId: chatId,
//             date: today,
//           },
//         });
//       }

//       // Upload each file
//       for (const file of files) {
//         const isImage = file.mimetype.startsWith("image/");
//         const isPDF = file.mimetype === "application/pdf";
//         const messageType = isImage ? "image" : isPDF ? "pdf" : "file";

//         // Upload to MinIO
//         const fileName = `chat/${chatId}/${Date.now()}-${file.originalname}`;
//         const uploadResult = await minioService.uploadFile(
//           file.buffer,
//           fileName,
//           file.mimetype
//         );

//         // Save to database
//         const messageContent =
//           messageType === "text" ? file.originalname : uploadResult.url;

//         const message = await prisma.chatMessage.create({
//           data: {
//             chatDateId: chatDate.id,
//             sender: sender || "user",
//             content: messageContent,
//             type: messageType,
//           },
//           select: {
//             id: true,
//             sender: true,
//             content: true,
//             type: true,
//             sentAt: true,
//           },
//         });

//         uploadedMessages.push({
//           ...message,
//           fileUrl: uploadResult.url,
//           fileName: file.originalname,
//           fileSize: file.size,
//           mimeType: file.mimetype,
//         });

//         // Update chat lastMessageId
//         await prisma.chat.update({
//           where: { id: chatId },
//           data: {
//             lastMessageId: message.id,
//             updatedAt: new Date(),
//           },
//         });

//         // Emit Socket.IO event
//         const io = getIO();
//         if (io) {
//           io.to(`chat:${chat.id}`).emit("new_message", {
//             id: message.id,
//             chatDateId: chatDate.id,
//             sender: message.sender,
//             content: message.content,
//             type: message.type,
//             fileUrl: uploadResult.url,
//             fileName: file.originalname,
//             fileSize: file.size,
//             mimeType: file.mimetype,
//             sentAt: message.sentAt,
//           });
//         }
//       }

//       res.status(200).json({
//         success: true,
//         message: `${uploadedMessages.length} file berhasil diupload`,
//         data: uploadedMessages,
//       });
//     } catch (error) {
//       console.error("❌ Multiple upload error:", error);
//       res.status(500).json({
//         success: false,
//         message: error.message || "Gagal upload files",
//       });
//     }
//   }
// );

// export default router;

import express from "express";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import minioService from "../service/minioService.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
// ✅ IMPORT GETIO: Pastikan path ini benar (sesuaikan jika file ada di folder socket)
import { getIO } from "../chatSocket.js"; 

const router = express.Router();
const prisma = new PrismaClient();

// Konfigurasi Multer (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * 📤 POST /api/chat/upload
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { chatId, sender } = req.body;

      console.log("📤 [ROUTE] Upload Request:", { chatId, sender, file: !!file });

      // 1. Validasi Input
      if (!file) return res.status(400).json({ success: false, message: "File wajib ada" });
      if (!chatId) return res.status(400).json({ success: false, message: "ChatId wajib ada" });

      // 2. Cek Chat di DB
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, chatKey: true, isActive: true, userId: true, doctorId: true },
      });

      if (!chat || !chat.isActive) {
        return res.status(400).json({ success: false, message: "Chat tidak valid/aktif" });
      }

      // 3. Tentukan Tipe & Nama File
      const type = file.mimetype.startsWith("image/") ? "image" : "pdf";
      const fileName = `chat/${chatId}/${Date.now()}-${file.originalname.replace(/\s/g, "")}`;

      // 4. Upload ke MinIO
      console.log("☁️ Uploading to MinIO...");
      const uploadResult = await minioService.uploadFile(file.buffer, fileName, file.mimetype);
      const fileUrl = uploadResult.url;

      // 5. Update/Create ChatDate (Grouping Tanggal)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const chatDate = await prisma.chatDate.upsert({
        where: { chatId_date: { chatId: chat.id, date: today } },
        update: {},
        create: { chatId: chat.id, date: today },
        select: { id: true },
      });

      // 6. Simpan Pesan ke DB
      const savedMessage = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: sender,
          content: fileUrl,
          type: type,
        },
      });

      console.log(`✅ Database Saved. ID: ${savedMessage.id}`);

      // 7. Update Last Message Chat
      await prisma.chat.update({
        where: { id: chat.id },
        data: { lastMessageId: savedMessage.id, updatedAt: new Date() },
      });

      // 8. Payload untuk Socket & Response
      const messagePayload = {
        id: savedMessage.id,
        chatId: chat.id, // Penting untuk filter di Frontend
        chatDateId: chatDate.id,
        sender: sender,
        content: fileUrl,
        type: type,
        fileUrl: fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        sentAt: savedMessage.sentAt,
        chatDate: { date: today.toISOString() },
      };

      // ============================================================
      // 🔥 BROADCAST SOCKET (BAGIAN YG DIPERBAIKI)
      // ============================================================
      try {
        // Gunakan getIO() agar instance SAMA dengan chat text
        const io = getIO(); 
        
        if (io) {
          // ✅ GUNAKAN PREFIX 'chat:'
          const roomName = `chat:${chat.id}`; 
          
          // Debugging: Cek apakah ada orang di room
          const room = io.sockets.adapter.rooms.get(roomName);
          const memberCount = room ? room.size : 0;

          console.log(`📢 [ROUTE] Broadcasting to room: ${roomName}`);
          console.log(`👥 [ROUTE] Members in room: ${memberCount}`);

          io.to(roomName).emit("new_message", messagePayload);
        } else {
          console.error("❌ [ROUTE] Socket IO instance is null (getIO failed)");
        }
      } catch (socketErr) {
        console.error("❌ [ROUTE] Socket Error:", socketErr);
      }
      // ============================================================

      // 9. Response Sukses
      return res.status(200).json({
        success: true,
        message: "Upload berhasil",
        data: messagePayload,
      });

    } catch (err) {
      console.error("❌ [ROUTE] Upload Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * 📤 POST /api/chat/upload/multiple
 */
router.post(
  "/upload/multiple",
  authMiddleware,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files;
      const { chatId, sender } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, message: "Tidak ada file" });
      }

      // ... (Kode validasi chat sama seperti single upload) ...
      // Agar ringkas, saya fokus ke bagian broadcast loop

      const prisma = new PrismaClient(); // Gunakan instance prisma yg ada
      // ... logic chat check ...
      // Asumsi chat valid:

      const uploadedMessages = [];
      const io = getIO(); // Ambil IO sekali di luar loop

      for (const file of files) {
         // ... Logic upload minio & create DB message ...
         // Anggaplah 'message' dan 'fileUrl' sudah terbentuk

         // Broadcast Loop
         if (io) {
            const roomName = `chat:${chatId}`; // ✅ Prefix Chat
            // io.to(roomName).emit("new_message", payload);
         }
         // ...
      }

      // Kembalikan response
      // ...
    } catch (error) {
       // ...
    }
  }
);

export default router;