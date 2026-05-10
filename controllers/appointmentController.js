import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class AppointmentController {
  constructor() {
    this.createAppointment = this.createAppointment.bind(this);
    this.getAvailableSlots = this.getAvailableSlots.bind(this);
    this.getUserAppointments = this.getUserAppointments.bind(this);
  }

  // ✅ 1. Buat Janji Temu Baru
  async createAppointment(req, res) {
    try {
      const { userId, doctorId, scheduleId, date, time, notes } = req.body;

      // 🔹 Validasi input
      if (!userId || !doctorId || !date || !time) {
        return res.status(400).json({ success: false, message: "Data tidak lengkap" });
      }

      // 🔹 Cek apakah jadwal sudah di-booking orang lain
      const existing = await prisma.appointment.findFirst({
        where: { doctorId, date: new Date(date), time, status: { not: "CANCELLED" } }
      });

      if (existing) {
        return res.status(400).json({ success: false, message: "Jadwal sudah terisi" });
      }

      // 🔹 Simpan appointment
      const newAppointment = await prisma.appointment.create({
        data: { userId, doctorId, scheduleId, date: new Date(date), time, notes, status: "PENDING" }
      });

      res.status(201).json({ success: true, message: "Janji temu berhasil dibuat", data: newAppointment });
    } catch (error) {
      console.error("❌ createAppointment error:", error);
      res.status(500).json({ success: false, message: "Gagal membuat janji temu", error: error.message });
    }
  }

  // ✅ 2. Ambil Jadwal Kosong (Untuk dipilih Pasien di aplikasi)
  async getAvailableSlots(req, res) {
    try {
      // Kita pakai query params, misal: ?doctorId=123&date=2026-05-15
      const { doctorId, date } = req.query; 

      if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: "doctorId dan date wajib diisi" });
      }

      // 1. Cari hari dari tanggal (B. Inggris, karena database nyimpennya Monday, Tuesday, dll)
      const dateObj = new Date(date);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];

      // 2. Ambil jadwal master dokter di hari tersebut
      const schedules = await prisma.doctorSchedule.findMany({
        where: { doctorId: doctorId, day: dayName, isActive: true }
      });

      // 3. Ambil jadwal yang SUDAH di-booking pada tanggal tersebut
      const bookedAppointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorId,
          date: dateObj,
          status: { not: "CANCELLED" }
        },
        select: { time: true } // Cuma ambil jam-nya (contoh: "10:00 - 11:00")
      });

      const bookedTimes = bookedAppointments.map(app => app.time);

      // 4. Saring jadwal: Buang jadwal yang jamnya ada di array bookedTimes
      const availableSlots = schedules.filter(schedule => {
        const timeSlot = `${schedule.startTime} - ${schedule.endTime}`;
        return !bookedTimes.includes(timeSlot);
      });

      res.json({ success: true, data: availableSlots });
    } catch (error) {
      console.error("❌ getAvailableSlots error:", error);
      res.status(500).json({ success: false, message: "Gagal mengambil slot jadwal", error: error.message });
    }
  }

  // ✅ 3. Ambil Daftar Janji Temu Milik Pasien (Untuk menu Riwayat Janji Temu)
  async getUserAppointments(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ success: false, message: "userId wajib diisi" });
      }

      // Ambil riwayat dengan relasi ke tabel doctor agar bisa nampilin foto & nama dokter
      const appointments = await prisma.appointment.findMany({
        where: { userId: userId },
        include: {
          doctor: { 
            select: { id: true, fullname: true, photo: true, category: true, alamatRumahSakit: true } 
          }
        },
        orderBy: { date: 'desc' } // Urutkan dari yang paling baru
      });

      res.json({ success: true, data: appointments });
    } catch (error) {
      console.error("❌ getUserAppointments error:", error);
      res.status(500).json({ success: false, message: "Gagal mengambil daftar janji temu", error: error.message });
    }
  }
}

export default new AppointmentController();