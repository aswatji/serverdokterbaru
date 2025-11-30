import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import minioService from "../service/minioService.js";
import { dbConnection } from "../config/database.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get prisma instance dynamically to ensure it's fully initialized
const getPrisma = () => dbConnection.getInstance();

/**
 * 📤 Upload gambar/file untuk chat (seperti WhatsApp)
 * POST /api/chat/upload
 * Body: FormData dengan field "file" dan "chatId"
 */
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { chatId, sender } = req.body;
      const file = req.file;

      console.log("📤 Upload request:", {
        chatId,
        sender,
        file: file
          ? {
              originalName: file.originalname,
              mimetype: file.mimetype,
              size: file.size,
            }
          : null,
      });

      // Validasi
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "File tidak ditemukan",
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "chatId diperlukan",
        });
      }

      // Verify chat exists and is active
      const prisma = getPrisma();

      console.log("🔍 Debug Prisma:", {
        prismaExists: !!prisma,
        prismaType: typeof prisma,
        hasMessage: !!prisma?.message,
        hasChat: !!prisma?.chat,
        prismaKeys: prisma ? Object.keys(prisma).slice(0, 10) : [],
      });

      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: {
          id: true,
          isActive: true,
          userId: true,
          doctorId: true,
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat tidak ditemukan",
        });
      }

      if (!chat.isActive) {
        return res.status(400).json({
          success: false,
          message: "Chat sudah tidak aktif",
        });
      }

      // Determine file type
      const isImage = file.mimetype.startsWith("image/");
      const isPDF = file.mimetype === "application/pdf";
      const messageType = isImage ? "image" : isPDF ? "pdf" : "file";

      // Upload to MinIO
      console.log("☁️ Uploading to MinIO...");
      const fileName = `chat/${chatId}/${Date.now()}-${file.originalname}`;
      const uploadResult = await minioService.uploadFile(
        file.buffer,
        fileName,
        file.mimetype
      );

      console.log(`✅ File uploaded: ${uploadResult.url}`);

      // Save message to database
      console.log("💾 Saving message to database...");

      // Get or create ChatDate for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let chatDate = await prisma.chatDate.findUnique({
        where: {
          chatId_date: {
            chatId: chatId,
            date: today,
          },
        },
      });

      if (!chatDate) {
        chatDate = await prisma.chatDate.create({
          data: {
            chatId: chatId,
            date: today,
          },
        });
      }

      // Create message with file info
      // Store file URL in content for file/image types
      const messageContent =
        messageType === "text" ? file.originalname : uploadResult.url;

      const message = await prisma.chatMessage.create({
        data: {
          chatDateId: chatDate.id,
          sender: sender || "user",
          content: messageContent,
          type: messageType,
        },
        select: {
          id: true,
          sender: true,
          content: true,
          type: true,
          sentAt: true,
        },
      });

      console.log("✅ Message saved to database:", message.id);

      // Update chat lastMessageId and updatedAt
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageId: message.id,
          updatedAt: new Date(),
        },
      });

      // Emit real-time notification via Socket.IO
      const io = req.app.get("io");
      if (io) {
        const roomName = `chat:${chat.id}`;
        io.to(roomName).emit("new_message", {
          id: message.id,
          chatDateId: chatDate.id,
          sender: message.sender,
          content: message.content, // URL untuk display
          type: message.type,
          fileUrl: uploadResult.url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          sentAt: message.sentAt,
        });
        console.log(`🔔 Socket.IO notification sent to room: ${roomName}`);
      }

      res.status(200).json({
        success: true,
        message: "File berhasil diupload",
        data: {
          id: message.id,
          chatDateId: chatDate.id,
          sender: message.sender,
          content: message.content, // URL untuk image/pdf/file, filename untuk text
          type: message.type, // "image", "pdf", "file", or "text"
          fileUrl: uploadResult.url, // Always include for download
          fileName: file.originalname, // Original filename
          fileSize: file.size,
          mimeType: file.mimetype,
          sentAt: message.sentAt,
        },
      });
    } catch (error) {
      console.error("❌ Upload error:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        success: false,
        message: error.message || "Gagal upload file",
      });
    }
  }
);

/**
 * 📤 Upload multiple files (batch upload)
 * POST /api/chat/upload/multiple
 */
router.post(
  "/upload/multiple",
  authMiddleware,
  upload.array("files", 10), // Max 10 files
  async (req, res) => {
    try {
      const { chatId, sender } = req.body;
      const files = req.files;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Tidak ada file yang diupload",
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: "chatId diperlukan",
        });
      }

      // Verify chat
      const prisma = getPrisma();
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { id: true, isActive: true },
      });

      if (!chat || !chat.isActive) {
        return res.status(400).json({
          success: false,
          message: "Chat tidak valid atau tidak aktif",
        });
      }

      const uploadedMessages = [];

      // Get or create ChatDate for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let chatDate = await prisma.chatDate.findUnique({
        where: {
          chatId_date: {
            chatId: chatId,
            date: today,
          },
        },
      });

      if (!chatDate) {
        chatDate = await prisma.chatDate.create({
          data: {
            chatId: chatId,
            date: today,
          },
        });
      }

      // Upload each file
      for (const file of files) {
        const isImage = file.mimetype.startsWith("image/");
        const isPDF = file.mimetype === "application/pdf";
        const messageType = isImage ? "image" : isPDF ? "pdf" : "file";

        // Upload to MinIO
        const fileName = `chat/${chatId}/${Date.now()}-${file.originalname}`;
        const uploadResult = await minioService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype
        );

        // Save to database
        const messageContent =
          messageType === "text" ? file.originalname : uploadResult.url;

        const message = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: sender || "user",
            content: messageContent,
            type: messageType,
          },
          select: {
            id: true,
            sender: true,
            content: true,
            type: true,
            sentAt: true,
          },
        });

        uploadedMessages.push({
          ...message,
          fileUrl: uploadResult.url,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        });

        // Update chat lastMessageId
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            lastMessageId: message.id,
            updatedAt: new Date(),
          },
        });

        // Emit Socket.IO event
        const io = req.app.get("io");
        if (io) {
          io.to(`chat:${chat.id}`).emit("new_message", {
            id: message.id,
            chatDateId: chatDate.id,
            sender: message.sender,
            content: message.content,
            type: message.type,
            fileUrl: uploadResult.url,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            sentAt: message.sentAt,
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `${uploadedMessages.length} file berhasil diupload`,
        data: uploadedMessages,
      });
    } catch (error) {
      console.error("❌ Multiple upload error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Gagal upload files",
      });
    }
  }
);

export default router;
