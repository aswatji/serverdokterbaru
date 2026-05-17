import { PrismaClient } from "@prisma/client";
import redisClient from "../utils/redisClient.js"; // Pastikan path ini benar

const prisma = new PrismaClient();

class RatingController {
  constructor() {
    this.createOrUpdateRating = this.createOrUpdateRating.bind(this);
    this.getDoctorRatings = this.getDoctorRatings.bind(this);
    this.deleteRating = this.deleteRating.bind(this);
  }

  // ✅ 1. Tambah atau update rating dokter
  async createOrUpdateRating(req, res) {
    try {
      const { doctorId, userId, rating, comment } = req.body;

      // 🔹 Validasi input
      if (!doctorId || !userId || !rating) {
        return res.status(400).json({
          success: false,
          message: "doctorId, userId, dan rating wajib diisi",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating harus bernilai antara 1 hingga 5",
        });
      }

      // 🔹 Simpan atau update rating user untuk dokter
      const newRating = await prisma.doctorRating.upsert({
        where: { doctorId_userId: { doctorId, userId } },
        update: { rating, comment },
        create: { doctorId, userId, rating, comment },
      });

      // 🗑️ INVALIDASI CACHE KARENA RATING BERUBAH
      await redisClient.del(`doctor_ratings:${doctorId}`);
      await redisClient.del(`doctor:detail:${doctorId}`);
      await redisClient.del("doctors:all_with_stats");

      res.status(201).json({
        success: true,
        message: "Rating berhasil disimpan",
        data: newRating,
      });
    } catch (error) {
      console.error("❌ createOrUpdateRating error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menyimpan rating",
        error: error.message,
      });
    }
  }

  // ✅ 2. Ambil semua rating untuk satu dokter
  async getDoctorRatings(req, res) {
    try {
      const { doctorId } = req.params;
      const cacheKey = `doctor_ratings:${doctorId}`;

      // ⚡ CEK REDIS
      const cachedRatings = await redisClient.get(cacheKey);
      if (cachedRatings) {
        return res.json(JSON.parse(cachedRatings));
      }

      // 🔍 AMBIL DARI DATABASE JIKA REDIS KOSONG
      const ratings = await prisma.doctorRating.findMany({
        where: { doctorId },
        include: {
          user: { select: { fullname: true, photo: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      // 🔹 Hitung rata-rata rating
      const avg = await prisma.doctorRating.aggregate({
        where: { doctorId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const responseData = {
        success: true,
        average: avg._avg.rating ? parseFloat(avg._avg.rating.toFixed(1)) : 0,
        totalRatings: avg._count.rating,
        ratings,
      };

      // 📦 SIMPAN KE REDIS (Bisa diset lama karena akan dihapus otomatis saat ada rating baru)
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ getDoctorRatings error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil rating dokter",
        error: error.message,
      });
    }
  }

  // ✅ 3. Hapus rating user untuk dokter
  async deleteRating(req, res) {
    try {
      const { doctorId, userId } = req.body;

      if (!doctorId || !userId) {
        return res.status(400).json({
          success: false,
          message: "doctorId dan userId wajib diisi",
        });
      }

      await prisma.doctorRating.delete({
        where: { doctorId_userId: { doctorId, userId } },
      });

      // 🗑️ INVALIDASI CACHE KARENA RATING DIHAPUS
      await redisClient.del(`doctor_ratings:${doctorId}`);
      await redisClient.del(`doctor:detail:${doctorId}`);
      await redisClient.del("doctors:all_with_stats");

      res.json({
        success: true,
        message: "Rating berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ deleteRating error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal menghapus rating",
        error: error.message,
      });
    }
  }
}

export default new RatingController();
