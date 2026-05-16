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
      const { userId, doctorId, scheduleId, date, time, notes, type, price } =
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
          price: price || doctor?.price || 0,
          status: "PENDING",
        },
        include: {
          user: true,
          doctor: true,
        },
      });
      if (newAppointment.user && newAppointment.user.pushToken) {
        const doctorName = newAppointment.doctor.fullname;

        await sendPushNotification(
          newAppointment.user.pushToken,
          "Menunggu Pembayaran ⏳",
          `Jadwal berhasil dibuat! Silakan selesaikan pembayaran untuk dokter kesayangan Anda (dr. ${doctorName}) agar jadwal tidak otomatis dibatalkan.`,
          { screen: "Payment", appointmentId: newAppointment.id },
        );
      }

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
  // async getUserAppointments(req, res) {
  //   try {
  //     const { userId } = req.query;

  //     if (!userId) {
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "userId wajib diisi" });
  //     }

  //     const appointments = await prisma.appointment.findMany({
  //       where: { userId: userId },
  //       include: {
  //         doctor: {
  //           select: { id: true, fullname: true, photo: true, category: true },
  //         },
  //       },
  //       orderBy: { date: "desc" },
  //     });

  //     // 🔹 FORMAT DATA AGAR 100% SAMA DENGAN UI MOCKUP DI REACT NATIVE
  //     const formattedData = appointments.map((apt) => {
  //       const now = new Date();
  //       // Format tanggal ke Bahasa Indonesia (contoh: "Jumat, 16 Mei 2026")
  //       const dateString = new Date(apt.date).toLocaleDateString("id-ID", {
  //         weekday: "long",
  //         day: "numeric",
  //         month: "long",
  //         year: "numeric",
  //       });

  //       // Potong jam jika formatnya range (misal "10:00 - 11:00" -> "10:00")
  //       const fullTime = apt.time;

  //       // 2. Logika Pengecekan Waktu Otomatis (Ide Anda!)
  //       let currentStatus = apt.status.toLowerCase();

  //       if (currentStatus === "upcoming") {
  //         try {
  //           // Pecah "10:00 - 11:00" untuk mengambil "11:00"
  //           const timeParts = fullTime.split("-");
  //           if (timeParts.length === 2) {
  //             const endTimeStr = timeParts[1].trim(); // Dapat "11:00"
  //             const [endHour, endMinute] = endTimeStr.split(":").map(Number);

  //             // Buat objek waktu kadaluarsa gabungan dari tanggal dan jam akhir
  //             const appointmentEndDate = new Date(apt.date);
  //             appointmentEndDate.setHours(endHour, endMinute, 0, 0);

  //             // Jika waktu saat ini sudah melewati batas akhir jadwal
  //             if (now > appointmentEndDate) {
  //               currentStatus = "completed"; // Otomatis ubah ke selesai!

  //               // (Opsional) Update status di database secara background agar tersinkronisasi
  //               prisma.appointment
  //                 .update({
  //                   where: { id: apt.id },
  //                   data: { status: "COMPLETED" },
  //                 })
  //                 .catch((err) =>
  //                   console.error("Gagal update auto-completed:", err),
  //                 );
  //             }
  //           }
  //         } catch (e) {
  //           console.error("Error parsing time for auto-complete", e);
  //         }
  //       }

  //       return {
  //         id: apt.id,
  //         doctorId: apt.doctor.id,
  //         doctorName: apt.doctor.fullname,
  //         doctorSpecialty: apt.doctor.category,
  //         doctorImage:
  //           apt.doctor.photo ||
  //           `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor.fullname)}&background=0D9488&color=fff`,
  //         date: dateString,
  //         rawDate: apt.date,
  //         time: fullTime, // ✅ Mengembalikan "10:00 - 11:00" secara utuh
  //         status: currentStatus, // ✅ Status sudah melewati pengecekan waktu otomatis
  //         type: apt.type?.toLowerCase() || "chat",
  //         price: apt.price || 0,
  //       };
  //     });
  //     res.json({ success: true, data: formattedData });
  //   } catch (error) {
  //     console.error("❌ getUserAppointments error:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Gagal mengambil daftar janji temu",
  //       error: error.message,
  //     });
  //   }
  // }

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
          // 🔥 TAMBAHAN 1: Ambil data pembayaran untuk mengecek timer 30 menit chat
          payments: {
            where: { status: "success" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { date: "desc" },
      });

      // 🔹 FORMAT DATA AGAR 100% SAMA DENGAN UI MOCKUP DI REACT NATIVE
      const formattedData = appointments.map((apt) => {
        const now = new Date();
        // Format tanggal ke Bahasa Indonesia
        const dateString = new Date(apt.date).toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        const fullTime = apt.time;

        // 2. Logika Pengecekan Waktu Otomatis
        let currentStatus = apt.status.toLowerCase();

        // 🔥 TAMBAHAN 2: Masukkan "ongoing" ke dalam kondisi pengecekan expired
        if (currentStatus === "upcoming" || currentStatus === "ongoing") {
          try {
            let isExpired = false;

            // -- Skenario A: Jam jadwal sudah lewat (Misal: lewat dari jam 11:00) --
            const timeParts = fullTime.split("-");
            if (timeParts.length === 2) {
              const endTimeStr = timeParts[1].trim(); // Dapat "11:00"
              const [endHour, endMinute] = endTimeStr.split(":").map(Number);

              const appointmentEndDate = new Date(apt.date);
              appointmentEndDate.setHours(endHour, endMinute, 0, 0);

              if (now > appointmentEndDate) {
                isExpired = true;
              }
            }

            // -- Skenario B: Timer 30 menit chat habis (Khusus Ongoing) --
            if (
              currentStatus === "ongoing" &&
              apt.payments &&
              apt.payments.length > 0
            ) {
              const paymentExpiry = new Date(apt.payments[0].expiresAt);
              if (now > paymentExpiry) {
                isExpired = true; // Timer 30 menit sudah lewat
              }
            }

            // -- Jika salah satu skenario terpenuhi, ubah jadi COMPLETED --
            if (isExpired) {
              currentStatus = "completed"; // Otomatis ubah ke selesai!

              // Update status di database secara background agar tersinkronisasi
              prisma.appointment
                .update({
                  where: { id: apt.id },
                  data: { status: "COMPLETED" },
                })
                .catch((err) =>
                  console.error("Gagal update auto-completed:", err),
                );
            }
          } catch (e) {
            console.error("Error parsing time for auto-complete", e);
          }
        }

        return {
          id: apt.id,
          doctorId: apt.doctor.id,
          doctorName: apt.doctor.fullname,
          doctorSpecialty: apt.doctor.category,
          doctorImage:
            apt.doctor.photo ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.doctor.fullname)}&background=0D9488&color=fff`,
          date: dateString,
          rawDate: apt.date,
          time: fullTime,
          status: currentStatus, // ✅ Status sudah bersih dan rapi
          type: apt.type?.toLowerCase() || "chat",
          price: apt.price || 0,
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
  // =================================================================
  // ✅ FITUR BARU: Mulai Sesi Chat & Mulai Timer 30 Menit
  // =================================================================
  async startChatSession(req, res) {
    try {
      const { appointmentId } = req.body;

      // 1. Cari data appointment beserta data payment yang sukses
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          payments: { where: { status: "success" } },
        },
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: "Jadwal konsultasi tidak ditemukan",
        });
      }

      if (appointment.payments.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Jadwal ini belum dibayar lunas" });
      }

      const payment = appointment.payments[appointment.payments.length - 1]; // Ambil pembayaran terakhir yang sukses
      const now = new Date();

      // 2. CEK STATUS: Hanya update waktu JIKA ini adalah pertama kalinya ditekan
      if (
        appointment.status === "UPCOMING" ||
        appointment.status === "upcoming"
      ) {
        // Buat waktu expired 30 menit dari waktu tombol ditekan SEKARANG
        const newExpiry = new Date(now.getTime() + 30 * 60 * 1000);

        // A. Update expiredAt di Payment
        await prisma.payment.update({
          where: { id: payment.id },
          data: { expiresAt: newExpiry },
        });

        // B. Update expiredAt dan aktifkan Chat
        const existingChat = await prisma.chat.findFirst({
          where: { doctorId: appointment.doctorId, userId: appointment.userId },
        });

        if (existingChat) {
          await prisma.chat.update({
            where: { id: existingChat.id },
            data: { expiredAt: newExpiry, isActive: true },
          });
        }

        // C. Ubah status Appointment menjadi ONGOING agar waktu tidak ter-reset jika ditekan lagi
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "ONGOING" },
        });

        return res.status(200).json({
          success: true,
          message: "Sesi chat dimulai! Waktu 30 menit berjalan.",
          expiresAt: newExpiry,
        });
      } else if (
        appointment.status === "ONGOING" ||
        appointment.status === "ongoing"
      ) {
        // Jika sudah pernah ditekan (misal user keluar layar lalu masuk lagi), kembalikan sisa waktu yang ada
        return res.status(200).json({
          success: true,
          message: "Melanjutkan sesi chat.",
          expiresAt: payment.expiresAt,
        });
      } else {
        return res.status(400).json({
          success: false,
          message: `Sesi chat tidak bisa dimulai karena status: ${appointment.status}`,
        });
      }
    } catch (error) {
      console.error("❌ startChatSession error:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memulai sesi chat",
        error: error.message,
      });
    }
  }
}

export default new AppointmentController();
