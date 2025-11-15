import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import minioService from "../service/minioService.js";
import prisma from "../config/database.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * 📤 Upload gambar/file untuk chat (seperti WhatsApp)
 * POST /api/chat/upload
 * Body: FormData dengan field "file" dan "chatId"
 */
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
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

    // Verify chat exists and active
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

    console.log("✅ File uploaded to MinIO:", uploadResult.url);

    // Save message to database
    const message = await prisma.message.create({
      data: {
        chatId: chatId,
        sender: sender || "user",
        content: file.originalname, // File name as content
        type: messageType,
        fileUrl: uploadResult.url,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        read: false,
      },
      include: {
        chat: {
          select: {
            userId: true,
            doctorId: true,
          },
        },
      },
    });

    console.log("✅ Message saved to database:", message.id);

    // Emit real-time notification via Socket.IO
    const io = req.app.get("io");
    if (io) {
      const roomName = `${chatId}`;
      io.to(roomName).emit("new_message", {
        id: message.id,
        chatId: message.chatId,
        sender: message.sender,
        content: message.content,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        read: message.read,
        createdAt: message.createdAt,
      });
      console.log(`🔔 Socket.IO notification sent to room: ${roomName}`);
    }

    res.status(200).json({
      success: true,
      message: "File berhasil diupload",
      data: {
        id: message.id,
        chatId: message.chatId,
        sender: message.sender,
        type: message.type,
        fileUrl: message.fileUrl,
        fileName: message.fileName,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Gagal upload file",
    });
  }
});

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
        const message = await prisma.message.create({
          data: {
            chatId: chatId,
            sender: sender || "user",
            content: file.originalname,
            type: messageType,
            fileUrl: uploadResult.url,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            read: false,
          },
        });

        uploadedMessages.push(message);

        // Emit Socket.IO event
        const io = req.app.get("io");
        if (io) {
          io.to(`${chatId}`).emit("new_message", {
            id: message.id,
            chatId: message.chatId,
            sender: message.sender,
            content: message.content,
            type: message.type,
            fileUrl: message.fileUrl,
            fileName: message.fileName,
            fileSize: message.fileSize,
            mimeType: message.mimeType,
            read: message.read,
            createdAt: message.createdAt,
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
