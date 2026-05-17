import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import redisClient from "../utils/redisClient.js";

const prisma = new PrismaClient();

class DoctorController {
  // ✅ Ambil semua dokter
  async getAllDoctors(req, res) {
    try {
      const cacheKey = "doctors:all_with_stats";

      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log("⚡ Mengambil list Dokter dari REDIS");
        return res.json(JSON.parse(cachedData)); // Langsung return jika ada
      }
      const serverTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      });
      const now = new Date(serverTime);

      const days = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      const currentDay = days[now.getDay()];

      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      const doctors = await prisma.doctor.findMany({
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          alamatRumahSakit: true,
          bio: true,
          photo: true,
          experienceYears: true,
          price: true,
          createdAt: true,
          updatedAt: true,
          about: true,
          schedules: {
            where: { day: currentDay, isActive: true },
            select: { startTime: true, endTime: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // 🔄 Hitung chat dan rating agar seragam dengan halaman kategori
      const doctorsWithStats = await Promise.all(
        doctors.map(async (doctor) => {
          const chatCount = await prisma.chat.count({
            where: { doctorId: doctor.id },
          });

          const reviewStats = await prisma.doctorRating.aggregate({
            where: { doctorId: doctor.id },
            _avg: { rating: true },
            _count: { id: true },
          });

          const avgRating = reviewStats._avg.rating
            ? parseFloat(reviewStats._avg.rating.toFixed(1))
            : 0;

          const isAvailableNow = doctor.schedules.some((schedule) => {
            return (
              schedule.startTime <= currentTime &&
              schedule.endTime >= currentTime
            );
          });

          // Hapus array schedules agar JSON response tidak bengkak
          const { schedules, ...cleanDoctorData } = doctor;

          return {
            ...cleanDoctorData,
            available: isAvailableNow,
            consultationCount: chatCount,
            rating: avgRating,
            totalReviews: reviewStats._count.id,
          };
        }),
      );

      const responseData = { success: true, data: doctorsWithStats };

      // 📦 SIMPAN KE REDIS: Set hanya 300 detik (5 Menit) agar status "available" terus terupdate
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getAllDoctors:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // ✅ Ambil dokter berdasarkan ID
  // → Cache 5 menit (rating & jadwal cukup sering berubah)
  async getDoctorById(req, res) {
    try {
      const { doctorId } = req.params;
      const key = `doctors:detail:${doctorId}`;

      // ── Cache HIT ──
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.status(200).json({ ...JSON.parse(cached), source: "cache" });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        include: {
          ratings: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              user: { select: { fullname: true, photo: true } },
            },
          },
          schedules: { where: { isActive: true } },
        },
      });

      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }

      // Hitung rata-rata rating
      const reviewStats = await prisma.doctorRating.aggregate({
        where: { doctorId: doctorId },
        _avg: { rating: true },
        _count: { id: true },
      });

      const avgRating = reviewStats._avg.rating
        ? reviewStats._avg.rating.toFixed(1)
        : 0;

      // 🛑 Hapus field sensitif sebelum dikirim
      const { password, pushToken, ...safeDoctorData } = doctor;

      const responseData = {
        success: true,
        source: "db",
        data: {
          ...safeDoctorData,
          ratingStats: {
            average: parseFloat(avgRating),
            total: reviewStats._count.id,
          },
        },
      };

      // ── Simpan ke Redis 5 menit ──
      await redisClient.setEx(key, 300, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getDoctorById:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  async updateProfile(req, res) {
    try {
      // 1. Ambil ID dari URL (:doctorId)
      const { doctorId } = req.params;

      if (!doctorId) {
        return res
          .status(400)
          .json({ success: false, message: "Doctor ID is required" });
      }

      // 2. Ambil data dari Body (termasuk photo)
      const {
        fullname,
        category,
        university,
        strNumber,
        gender,
        email,
        password,
        alamatRumahSakit,
        bio,
        about,
        experienceYears,
        price,
        photo,
      } = req.body;

      // 3. Cek Dokter ada atau tidak
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
      });

      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }

      // 4. Siapkan data update
      let updatedData = {
        fullname,
        category,
        university,
        strNumber,
        gender,
        email,
        alamatRumahSakit,
        bio,
        about,
        experienceYears: experienceYears ? parseInt(experienceYears) : null,
        price,
        photo,
      };

      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }

      // 5. Eksekusi Update ke Database
      const updatedDoctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: updatedData,
      });
      // 🗑️ Invalidate semua cache terkait dokter ini
      await redisClient.del("doctors:all_with_stats");
      await redisClient.del(`doctors:category:${updatedDoctor.category.toLowerCase()}`);
      await redisClient.del(`doctors:detail:${doctorId}`);
      await redisClient.del(`doctors:profile:${doctorId}`);

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedDoctor,
      });
    } catch (error) {
      console.error("❌ Error updateProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }

  // ✅ Ambil profil dokter login
  // → Cache 10 menit per doctorId (data profil jarang berubah)
  async getProfile(req, res) {
    try {
      const doctorId = req.user.id;
      const key = `doctors:profile:${doctorId}`;

      // ── Cache HIT ──
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.json({ ...JSON.parse(cached), source: "cache" });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          alamatRumahSakit: true,
          bio: true,
          about: true,
          experienceYears: true,
          price: true,
          photo: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const responseData = { success: true, source: "db", data: doctor };

      // ── Simpan ke Redis 10 menit ──
      await redisClient.setEx(key, 600, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }

  // ============================================================
  // ✅ FITUR JADWAL (SCHEDULE) TERBARU
  // ============================================================

  // 1. UPDATE MASSAL JADWAL (Multi Slot)
  async updateScheduleSettings(req, res) {
    try {
      const doctorId = req.user.id;
      const { schedules } = req.body; // Array dari Frontend

      if (!schedules || !Array.isArray(schedules)) {
        return res.status(400).json({
          success: false,
          message: "Data jadwal tidak valid",
        });
      }

      // Format data untuk prisma
      const formattedData = schedules.map((item) => ({
        doctorId: doctorId,
        day: item.day,
        startTime: item.start,
        endTime: item.end,
        isActive: item.active,
      }));

      // Gunakan Transaction: HAPUS SEMUA dulu, baru INSERT BARU
      await prisma.$transaction([
        prisma.doctorSchedule.deleteMany({
          where: { doctorId: doctorId },
        }),
        prisma.doctorSchedule.createMany({
          data: formattedData,
        }),
      ]);

      // 🗑️ Invalidate cache list dan jadwal
      await redisClient.del("doctors:all_with_stats");
      await redisClient.del("doctors:all_schedules");

      res.json({ success: true, message: "Jadwal berhasil diperbarui" });
    } catch (error) {
      console.error("❌ Error updateScheduleSettings:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui jadwal",
        error: error.message,
      });
    }
  }
  // 2. GET JADWAL (Untuk load awal di Frontend)
  async getMySchedules(req, res) {
    try {
      const doctorId = req.user.id;
      const schedules = await prisma.doctorSchedule.findMany({
        where: { doctorId },
      });

      // Format data agar sesuai dengan frontend (Active -> active, startTime -> start)
      const formatted = schedules.map((s) => ({
        day: s.day,
        active: s.isActive,
        start: s.startTime,
        end: s.endTime,
      }));

      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error("❌ Error getMySchedules:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ============================================================
  // ✅ FITUR LAINNYA
  // ============================================================

  async getDoctorChats(req, res) {
    try {
      const doctorId = req.user.id;
      const chats = await prisma.chat.findMany({
        where: { doctorId },
        orderBy: { createdAt: "desc" },
        include: { user: true, lastMessage: true },
      });

      res.json({ success: true, data: chats });
    } catch (error) {
      console.error("❌ Error getDoctorChats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chats",
        error: error.message,
      });
    }
  }

  async getDoctorChatById(req, res) {
    try {
      const { id } = req.params;
      const doctorId = req.user.id;

      const chat = await prisma.chat.findFirst({
        where: { id, doctorId },
        include: {
          user: true,
          messages: {
            orderBy: { sentAt: "asc" },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      res.json({ success: true, data: chat });
    } catch (error) {
      console.error("❌ Error getDoctorChatById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chat detail",
        error: error.message,
      });
    }
  }

  // → Cache 10 menit (kategori sangat jarang berubah)
  async getCategories(req, res) {
    try {
      const key = "doctors:categories";

      // ── Cache HIT ──
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.json({ ...JSON.parse(cached), source: "cache" });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const categories = await prisma.doctor.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      const categoryList = categories.map((item) => item.category);
      const responseData = { success: true, source: "db", data: categoryList };

      // ── Simpan ke Redis 10 menit ──
      await redisClient.setEx(key, 600, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getCategories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  async getDoctorsByCategory(req, res) {
    try {
      const { category } = req.params;

      const cacheKey = `doctors:category:${category.toLowerCase()}`; // Key spesifik per kategori
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      const serverTime = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Jakarta",
      });
      const now = new Date(serverTime);
      const days = [
        "Minggu",
        "Senin",
        "Selasa",
        "Rabu",
        "Kamis",
        "Jumat",
        "Sabtu",
      ];
      const currentDay = days[now.getDay()];

      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      const doctors = await prisma.doctor.findMany({
        where: {
          category: {
            equals: category,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          alamatRumahSakit: true,
          bio: true,
          photo: true,
          experienceYears: true,
          price: true,
          about: true,
          createdAt: true,
          updatedAt: true,
          schedules: {
            where: { day: currentDay, isActive: true },
            select: { startTime: true, endTime: true },
          },
        },
        orderBy: { fullname: "asc" },
      });

      // 🔄 LOOPING: Hitung chat dan rating untuk Masing-masing Dokter
      const doctorsWithStats = await Promise.all(
        doctors.map(async (doctor) => {
          // 1. Hitung jumlah konsultasi
          const chatCount = await prisma.chat.count({
            where: { doctorId: doctor.id },
          });

          // 2. Hitung Rata-rata Bintang dan JUMLAH ORANG YANG MEREVIEW
          const reviewStats = await prisma.doctorRating.aggregate({
            where: { doctorId: doctor.id },
            _avg: { rating: true },
            _count: { id: true },
          });

          const avgRating = reviewStats._avg.rating
            ? parseFloat(reviewStats._avg.rating.toFixed(1))
            : 0;
          const totalReviewers = reviewStats._count.id;

          const isAvailableNow = doctor.schedules.some((schedule) => {
            return (
              schedule.startTime <= currentTime &&
              schedule.endTime >= currentTime
            );
          });

          const { schedules, ...cleanDoctorData } = doctor;

          return {
            ...cleanDoctorData,
            available: isAvailableNow,
            consultationCount: chatCount,
            rating: avgRating,
            totalReviews: totalReviewers,
          };
        }),
      );

      const responseData = {
        success: true,
        message: `Found doctors`,
        data: doctorsWithStats,
      };

      // 📦 SIMPAN KE REDIS: 300 detik (5 menit)
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getDoctorsByCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch doctors by category",
        error: error.message,
      });
    }
  }

  // → Cache 5 menit (jadwal bisa berubah saat dokter update)
  async getAllDoctorSchedules(req, res) {
    try {
      const key = "doctors:all_schedules";

      // ── Cache HIT ──
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.json({ ...JSON.parse(cached), source: "cache" });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const schedules = await prisma.doctorSchedule.findMany({
        where: { isActive: true },
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              strNumber: true,
              category: true,
              university: true,
              photo: true,
              gender: true,
              price: true,
            },
          },
        },
        orderBy: { day: "asc" },
      });

      const responseData = {
        success: true,
        source: "db",
        message: "Berhasil mengambil jadwal beserta data dokter",
        data: schedules,
      };

      // ── Simpan ke Redis 5 menit ──
      await redisClient.setEx(key, 300, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Error getAllDoctorSchedules:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil data jadwal dokter",
        error: error.message,
      });
    }
  }
  async bulkInsertDoctors(req, res) {
    try {
      const doctorsArray = req.body; // Mengambil array JSON dari Insomnia

      if (!Array.isArray(doctorsArray)) {
        return res.status(400).json({
          success: false,
          message: "Data harus berupa Array JSON [...]",
        });
      }

      let count = 0;
      for (const doc of doctorsArray) {
        // Enkripsi password
        const hashedPassword = await bcrypt.hash(
          doc.password || "Password123!",
          10,
        );
        doc.password = hashedPassword;

        // Simpan ke database
        await prisma.doctor.create({ data: doc });
        count++;
      }

      res.status(201).json({
        success: true,
        message: `HORE! Berhasil memasukkan ${count} dokter sekaligus ke database.`,
      });
    } catch (error) {
      console.error("❌ Error Bulk Insert:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new DoctorController();
