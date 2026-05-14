import { PrismaClient } from "@prisma/client";
import { sendPushNotification } from "../utils/notification.js";
const prisma = new PrismaClient();

class AppointmentController {
  constructor() {
    this.createAppointment = this.createAppointment.bind(this);
    this.getAvailableSlots = this.getAvailableSlots.bind(this);
    this.getUserAppointments = this.getUserAppointments.bind(this);
    this.updateAppointmentStatus = this.updateAppointmentStatus.bind(this);
  }

  // ✅ 1. Buat Janji Temu Baru
  async createAppointment(req, res) {
    try {
      const { userId, doctorId, scheduleId, date, time, notes, type } =
        req.body;

      if (!userId || !doctorId || !date || !time) {
        return res
          .status(400)
          .json({ success: false, message: "Data tidak lengkap" });
      }

      // 🔹 Cek apakah PASIEN (userId) sudah punya jadwal di tanggal & jam yang sama
      // Mencegah 1 pasien konsultasi dengan 2 dokter berbeda di detik yang sama
      const existingUserAppointment = await prisma.appointment.findFirst({
        where: {
          userId: userId,
          date: new Date(date),
          time: time,
          status: { not: "CANCELLED" },
        },
      });

      if (existingUserAppointment) {
        return res.status(400).json({
          success: false,
          message:
            "Anda sudah memiliki jadwal konsultasi lain di waktu yang sama",
        });
      }

      // Ambil harga dokter saat ini untuk disimpan di riwayat appointment
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { price: true },
      });

      const newAppointment = await prisma.appointment.create({
        data: {
          userId,
          doctorId,
          scheduleId,
          date: new Date(date),
          time,
          notes,
          type: type || "CHAT", // Default ke CHAT
          price: doctor?.price || 0,
          status: "PENDING",
        },
      });

      res.status(201).json({
        success: true,
        message: "Janji temu berhasil dibuat",
        data: newAppointment,
      });
    } catch (error) {
      console.error("❌ createAppointment error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal membuat janji temu",
        error: error.message,
      });
    }
  }

  // ✅ 2. Ambil Jadwal Kosong (Jam selalu tersedia untuk banyak pasien)
  async getAvailableSlots(req, res) {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
        return res
          .status(400)
          .json({ success: false, message: "doctorId dan date wajib diisi" });
      }

      const dateObj = new Date(date);
      const days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = days[dateObj.getDay()];

      // Hanya ambil jadwal master dokter di hari tersebut
      const availableSlots = await prisma.doctorSchedule.findMany({
        where: { doctorId: doctorId, day: dayName, isActive: true },
      });

      // Filter pengecekan bookedAppointments dihapus.
      // Dokter bisa menerima tak terbatas pasien (chat) di satu waktu jadwal yang sama.

      res.json({ success: true, data: availableSlots });
    } catch (error) {
      console.error("❌ getAvailableSlots error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil slot jadwal",
        error: error.message,
      });
    }
  }

  // ✅ 3. Ambil Daftar Janji Temu (Diformat Khusus untuk React Native UI)
  async getUserAppointments(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "userId wajib diisi" });
      }

      const appointments = await prisma.appointment.findMany({
        where: { userId: userId },
        include: {
          doctor: {
            select: { id: true, fullname: true, photo: true, category: true },
          },
        },
        orderBy: { date: "desc" },
      });

      // 🔹 FORMAT DATA AGAR 100% SAMA DENGAN UI MOCKUP DI REACT NATIVE
      const formattedData = appointments.map((apt) => {
        // Format tanggal ke Bahasa Indonesia (contoh: "Jumat, 16 Mei 2026")
        const dateString = new Date(apt.date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Potong jam jika formatnya range (misal "10:00 - 11:00" -> "10:00")
        const startTime = apt.time.split("-")[0].trim();

        return {
          id: apt.id,
          doctorName: apt.doctor.fullname,
          doctorSpecialty: apt.doctor.category,
          // Gunakan foto dokter jika ada, jika tidak fallback ke ui-avatars
          doctorImage:
            apt.doctor.photo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor.fullname)}&background=0D9488&color=fff`,
          date: dateString,
          time: startTime,
          status: apt.status.toLowerCase(), // UPCOMING -> upcoming, COMPLETED -> completed
          type: apt.type.toLowerCase(), // CHAT -> chat
          price: apt.price,
        };
      });

      res.json({ success: true, data: formattedData });
    } catch (error) {
      console.error("❌ getUserAppointments error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal mengambil daftar janji temu",
        error: error.message,
      });
    }
  }
  // ✅ 4. FUNGSI BARU: Update Status Appointment & Kirim Notifikasi
  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || !status) {
        return res
          .status(400)
          .json({ success: false, message: "ID dan status wajib diisi" });
      }

      // 1. Update data di database Prisma sekaligus MENGAMBIL data User & Doctor
      const updatedAppointment = await prisma.appointment.update({
        where: { id: id },
        data: { status: status },
        // 🔥 include ini penting agar kita dapat pushToken pasien dan nama dokter
        include: {
          user: true,
          doctor: true,
        },
      });

      // 2. KIRIM NOTIFIKASI JIKA STATUS BERUBAH JADI "UPCOMING" (Pembayaran Sukses)
      if (status === "UPCOMING") {
        const pushToken = updatedAppointment.user.pushToken;

        if (pushToken) {
          const doctorName = updatedAppointment.doctor.fullname;
          const time = updatedAppointment.time;

          // Memanggil fungsi dari notification.js Anda
          await sendPushNotification(
            pushToken,
            "Pembayaran Berhasil! 🎉",
            `Konsultasi Anda dengan ${doctorName} jam ${time} telah dikonfirmasi.`,
            { screen: "AppointmentDetail", appointmentId: id }, // Data sisipan
          );
        } else {
          console.log(
            `⚠️ Pasien ${updatedAppointment.user.fullname} tidak memiliki pushToken.`,
          );
        }
      }

      res.json({
        success: true,
        message: "Status janji temu berhasil diperbarui",
        data: updatedAppointment,
      });
    } catch (error) {
      console.error("❌ updateAppointmentStatus error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui status janji temu",
        error: error.message,
      });
    }
  }
}

export default new AppointmentController();
