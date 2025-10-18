import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { uploadToMinio } from "../utils/minioUpload.js";

const prisma = new PrismaClient();

class UploadController {
  constructor(io) {
    this.io = io; // simpan instance socket.io
  }

  /**
   * @route POST /upload
   * @desc Upload file (image/pdf) dan simpan ke ChatMessage + kirim ke socket
   */
  async uploadFile(req, res) {
    try {
      const file = req.file;
      const { chatDateId, sender } = req.body;

      if (!file) return res.status(400).json({ error: "File tidak ditemukan" });
      if (!chatDateId || !sender)
        return res
          .status(400)
          .json({ error: "chatDateId dan sender wajib diisi" });

      // Validasi tipe file
      const allowed = ["image/jpeg", "image/png", "application/pdf"];
      if (!allowed.includes(file.mimetype))
        return res.status(400).json({ error: "Tipe file tidak didukung" });

      // Generate nama file unik
      const ext =
        file.mimetype === "application/pdf"
          ? ".pdf"
          : file.mimetype === "image/png"
          ? ".png"
          : ".jpg";
      const fileName = `${crypto.randomBytes(8).toString("hex")}${ext}`;

      // Upload ke MinIO
      const fileUrl = await uploadToMinio(
        process.env.MINIO_BUCKET || "uploads",
        fileName,
        file.buffer,
        file.mimetype
      );

      // Tentukan tipe pesan
      const type = file.mimetype === "application/pdf" ? "pdf" : "image";

      // Simpan ke Prisma
      const message = await prisma.chatMessage.create({
        data: {
          chatDateId,
          sender,
          content: fileUrl,
          type,
        },
      });

      // Broadcast ke semua client
      this.io.to(chatDateId).emit("new_message", message);

      return res.status(200).json({
        ok: true,
        message: "Upload berhasil",
        data: message,
      });
    } catch (err) {
      console.error("Upload Error:", err);
      return res.status(500).json({ error: "Upload gagal" });
    }
  }

  /**
   * @route GET /upload/:chatDateId
   * @desc Ambil semua pesan untuk satu chatDate
   */
  async getMessages(req, res) {
    try {
      const { chatDateId } = req.params;
      const messages = await prisma.chatMessage.findMany({
        where: { chatDateId },
        orderBy: { sentAt: "asc" },
      });

      return res.json({ ok: true, messages });
    } catch (err) {
      console.error("Get messages error:", err);
      return res.status(500).json({ error: "Gagal mengambil pesan" });
    }
  }
}

export default UploadController;
