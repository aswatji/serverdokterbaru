import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Fungsi ini akan diekspor dan dijalankan di file utama (index.js)
const startCronJobs = () => {
  // Jadwal ini berjalan setiap 5 menit sekali ('*/5 * * * *')
  // Anda bisa menggantinya jadi '* * * * *' jika ingin dicek setiap 1 menit
  cron.schedule("*/5 * * * *", async () => {
    console.log("⏳ [Cron Job] Mengecek appointment yang kedaluwarsa...");

    try {
      // Hitung waktu 30 menit yang lalu dari sekarang
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Cari dan update semua appointment yang PENDING dan usianya sudah lebih dari 30 menit
      const expiredAppointments = await prisma.appointment.updateMany({
        where: {
          status: "PENDING",
          createdAt: {
            lte: thirtyMinutesAgo, // lte = less than or equal (kurang dari atau sama dengan 30 menit lalu)
          },
        },
        data: {
          status: "CANCELLED",
        },
      });

      if (expiredAppointments.count > 0) {
        console.log(
          `✅ [Cron Job] Berhasil membatalkan ${expiredAppointments.count} jadwal yang tidak dibayar.`,
        );
      }
    } catch (error) {
      console.error("❌ [Cron Job] Terjadi kesalahan:", error.message);
    }
  });
};

export default startCronJobs;
