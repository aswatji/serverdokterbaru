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
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { chatId } = req.body;

      console.log("📤 [ROUTE] Upload Request:", { chatId, file: !!file });

      // 1. Validasi Input
      if (!file)
        return res
          .status(400)
          .json({ success: false, message: "File wajib ada" });
      if (!chatId)
        return res
          .status(400)
          .json({ success: false, message: "ChatId wajib ada" });

      // 2. Tentukan Nama File
      // Kita bersihkan nama file agar aman di URL
      const sanitizedFilename = file.originalname
        .replace(/\s/g, "_")
        .replace(/[^a-zA-Z0-9.-]/g, "");
      const fileName = `chat/${chatId}/${Date.now()}-${sanitizedFilename}`;

      // 3. Upload ke MinIO
      console.log("☁️ Uploading to MinIO...");
      const uploadResult = await minioService.uploadFile(
        file.buffer,
        fileName,
        file.mimetype
      );

      // Pastikan kita dapat string URL
      const fileUrl = uploadResult.url || uploadResult;

      console.log(`✅ Upload Sukses. URL: ${fileUrl}`);

      // ❌ HAPUS BAGIAN PRISMA CREATE / UPDATE
      // ❌ HAPUS BAGIAN SOCKET BROADCAST

      // 4. Return URL ke Frontend
      // Frontend yang akan menggunakan URL ini untuk mengirim pesan via Socket
      return res.status(200).json({
        success: true,
        message: "Upload berhasil",
        data: {
          fileUrl: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          // Kita tidak kirim ID pesan karena pesan belum dibuat di DB
        },
      });
    } catch (err) {
      console.error("❌ [ROUTE] Upload Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * 📤 POST /api/chat/upload/multiple
 * Logic sama: Hanya upload, return array of URLs
 */
router.post(
  "/upload/multiple",
  authMiddleware,
  upload.array("files", 10),
  async (req, res) => {
    try {
      const files = req.files;
      const { chatId } = req.body;

      if (!files || files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Tidak ada file" });
      }

      const uploadedFiles = [];

      for (const file of files) {
        const sanitizedFilename = file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");
        const fileName = `chat/${chatId}/${Date.now()}-${sanitizedFilename}`;

        const uploadResult = await minioService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype
        );

        const fileUrl = uploadResult.url || uploadResult;

        uploadedFiles.push({
          fileUrl: fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        });
      }

      // Return Array URL
      res.status(200).json({
        success: true,
        message: `${uploadedFiles.length} file berhasil diupload`,
        data: uploadedFiles,
      });
    } catch (error) {
      console.error("❌ Multiple upload error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
