import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

class DoctorController {
  // ✅ Ambil semua dokter
  async getAllDoctors(req, res) {
    try {
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

      res.json({ success: true, data: doctorsWithStats });
    } catch (error) {
      console.error("❌ Error getAllDoctors:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // ✅ Ambil dokter berdasarkan ID
  async getDoctorById(req, res) {
    try {
      const { doctorId } = req.params;

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

      // Menghitung Rata-rata Bintang dan Total Ulasan
      const reviewStats = await prisma.doctorRating.aggregate({
        where: { doctorId: doctorId },
        _avg: { rating: true },
        _count: { id: true },
      });

      const avgRating = reviewStats._avg.rating
        ? reviewStats._avg.rating.toFixed(1)
        : 0;

      // 🛑 HAPUS PASSWORD & TOKEN RAHASIA SEBELUM DIKIRIM KE FRONTEND
      const { password, pushToken, ...safeDoctorData } = doctor;

      // Gabungkan data dokter yang sudah AMAN dengan statistik rating
      res.json({
        success: true,
        data: {
          ...safeDoctorData,
          ratingStats: {
            average: parseFloat(avgRating),
            total: reviewStats._count.id,
          },
        },
      });
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
  async getProfile(req, res) {
    try {
      const doctorId = req.user.id;
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

      res.json({ success: true, data: doctor });
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

      res.json({
        success: true,
        message: "Jadwal berhasil diperbarui",
      });
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

  async getCategories(req, res) {
    try {
      const categories = await prisma.doctor.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      const categoryList = categories.map((item) => item.category);

      res.json({ success: true, data: categoryList });
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

      res.json({
        success: true,
        message: `Found ${doctorsWithStats.length} doctors`,
        data: doctorsWithStats,
      });
    } catch (error) {
      console.error("❌ Error getDoctorsByCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch doctors by category",
        error: error.message,
      });
    }
  }

  async getAllDoctorSchedules(req, res) {
    try {
      const schedules = await prisma.doctorSchedule.findMany({
        where: {
          isActive: true, // Opsional: Hanya tampilkan jadwal yang aktif
        },
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
        // Opsional: Urutkan berdasarkan jadwal terbaru atau hari
        orderBy: {
          day: "asc",
        },
      });

      res.json({
        success: true,
        message: "Berhasil mengambil jadwal beserta data dokter",
        data: schedules,
      });
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
