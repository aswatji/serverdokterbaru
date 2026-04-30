import { PrismaClient } from "@prisma/client";
import AWS from "aws-sdk";

const prisma = new PrismaClient();

const s3 = new AWS.S3({
  endpoint: process.env.MINIO_ENDPOINT,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

// ✅ Tambahkan parameter 'io' di sini
export const createPrescription = async (req, res, io) => {
  try {
    const { doctorId, userId, chatId, medicines } = req.body;
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, message: "File PDF resep wajib disertakan." });
    }

    const prescriptionCode = `RX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fileName = `resep/${prescriptionCode}.pdf`;

    const uploadParams = {
      Bucket: process.env.MINIO_BUCKET_RESEP,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Upload ke MinIO
    await s3.upload(uploadParams).promise();
    const fileUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_RESEP}/${fileName}`;

    // Simpan ke Prisma
    await prisma.prescription.create({
      data: {
        prescriptionCode,
        doctorId,
        userId,
        chatId: chatId || null,
        fileUrl,
        status: "AVAILABLE",
        medicines: medicines ? JSON.parse(medicines) : null,
      },
    });

    let messagePayload = null;

    // Jika dibuat dari dalam chat, kirim notifikasi real-time
    if (chatId) {
      const chatDate = await prisma.chatDate.findFirst({
        where: { chatId },
        orderBy: { date: "desc" },
      });

      if (chatDate) {
        const newMessage = await prisma.chatMessage.create({
          data: {
            chatDateId: chatDate.id,
            sender: doctorId,
            content: "Resep Digital diterbitkan",
            type: "prescription",
            content: req.body.medicines,
            // fileUrl: fileUrl,
          },
        });

        messagePayload = {
          id: newMessage.id,
          chatId,
          sender: doctorId,
          content: "Resep Digital diterbitkan",
          type: "prescription",
          fileUrl: fileUrl,
          sentAt: newMessage.sentAt,
          prescriptionCode: prescriptionCode,
        };

        // ✅ Gunakan 'io' yang dilempar dari routes/index.js
        if (io) {
          io.to(`chat:${chatId}`).emit("new_message", messagePayload);
          console.log(
            `📤 Resep berhasil di-emit via Socket ke ruang chat:${chatId}`,
          );
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Resep berhasil dibuat dan dikirim",
      data: messagePayload || { prescriptionCode, fileUrl },
    });
  } catch (error) {
    console.error("❌ Error upload resep:", error);
    return res
      .status(500)
      .json({ success: false, message: "Terjadi kesalahan di server." });
  }
};
