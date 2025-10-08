const prisma = require("../config/database");
const cron = require("node-cron");

class ConsultationScheduler {
  constructor() {
    this.jobs = new Map();
    this.runningJobs = new Set();
  }

  start() {
    console.log("✅ Consultation Scheduler (cron-based) started");

    // 🕐 1. Check expired consultations every minute
    this.jobs.set(
      "expiry-check",
      cron.schedule("* * * * *", () =>
        this.runSafeJob("expiry-check", this.checkExpiringConsultations.bind(this))
      )
    );

    // ⏳ 2. Check consultations expiring soon (every 30 seconds)
    // ⚠️ FIXED: previously invalid "*/0.5 * * * * *" now replaced with valid 30s interval
    this.jobs.set(
      "expiry-warning",
      cron.schedule("*/30 * * * * *", () =>
        this.runSafeJob("expiry-warning", this.checkConsultationsExpiringSoon.bind(this))
      )
    );

    // 🧹 3. Cleanup old inactive consultations daily at midnight
    this.jobs.set(
      "cleanup",
      cron.schedule("0 0 * * *", () =>
        this.runSafeJob("cleanup", this.cleanupOldConsultations.bind(this))
      )
    );

    // Start all cron jobs
    this.jobs.forEach((job) => job.start());
  }

  stop() {
    console.log("🛑 Consultation Scheduler stopped");
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
  }

  // Prevent overlapping jobs (mutex lock)
  async runSafeJob(name, fn) {
    if (this.runningJobs.has(name)) return; // skip if already running
    this.runningJobs.add(name);

    const start = Date.now();
    try {
      await fn();
    } catch (err) {
      console.error(`❌ Error in job ${name}:`, err);
    } finally {
      this.runningJobs.delete(name);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`⏱️ [${name}] finished in ${elapsed}s`);
    }
  }

  // 🔍 Check expired consultations
  async checkExpiringConsultations() {
    const now = new Date();
    const expired = await prisma.consultation.findMany({
      where: { isActive: true, expiresAt: { lte: now } },
      select: { id: true },
    });

    if (!expired.length) return; // no log spam

    console.log(`⚠️ Found ${expired.length} expired consultations`);
    const ids = expired.map((c) => c.id);

    await prisma.consultation.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    try {
      const { getIO } = require("../chatSocket");
      const io = getIO();
      expired.forEach((c) => {
        io.to(`consultation:${c.id}`).emit("consultation_status", {
          isActive: false,
          expired: true,
          message: "Consultation has expired",
        });
      });
    } catch (e) {
      console.warn("Socket.IO broadcast skipped:", e.message);
    }

    console.log(`✅ Deactivated ${expired.length} consultations`);
  }

  // ⏰ Check consultations that will expire soon
  async checkConsultationsExpiringSoon() {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    const soon = await prisma.consultation.findMany({
      where: { isActive: true, expiresAt: { gte: now, lte: fiveMinutesLater } },
      select: { id: true, expiresAt: true },
    });

    if (!soon.length) return; // skip empty

    console.log(`⏳ ${soon.length} consultations expiring soon`);

    try {
      const { getIO } = require("../chatSocket");
      const io = getIO();

      soon.forEach((c) => {
        const remaining = Math.ceil((c.expiresAt - now) / 60000);
        io.to(`consultation:${c.id}`).emit("consultation_expiring_soon", {
          consultationId: c.id,
          message: `Consultation will expire in ${remaining} minutes`,
          timeRemaining: remaining,
          expiresAt: c.expiresAt,
        });
      });
    } catch (e) {
      console.warn("Socket.IO notification skipped:", e.message);
    }
  }

  // 🧹 Cleanup old inactive consultations (daily)
  async cleanupOldConsultations() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await prisma.consultation.deleteMany({
      where: { isActive: false, expiresAt: { lt: sevenDaysAgo } },
    });

    if (result.count > 0)
      console.log(`🧹 Cleaned up ${result.count} old consultations`);

    return result.count;
  }

  // 📊 Consultation statistics helper (optional)
  async getConsultationStats() {
    try {
      const [total, active, today, completed] = await Promise.all([
        prisma.consultation.count(),
        prisma.consultation.count({ where: { isActive: true } }),
        prisma.consultation.count({
          where: { startedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        }),
        prisma.consultation.count({ where: { isActive: false } }),
      ]);

      return {
        total,
        active,
        today,
        completed,
        timestamp: new Date(),
      };
    } catch (err) {
      console.error("Error getting consultation stats:", err);
      return null;
    }
  }
}

module.exports = ConsultationScheduler;


// const prisma = require("../config/database");

// class ConsultationScheduler {
//   constructor() {
//     this.intervals = new Map();
//   }

//   start() {
//     console.log("Starting consultation scheduler...");

//     // Check for expiring consultations every minute
//     this.intervals.set(
//       "expiry-check",
//       setInterval(() => {
//         this.checkExpiringConsultations();
//       }, 60000)
//     ); // 60 seconds

//     // Check for consultations expiring in 5 minutes (warning)
//     this.intervals.set(
//       "expiry-warning",
//       setInterval(() => {
//         this.checkConsultationsExpiringSoon();
//       }, 30000)
//     ); // 30 seconds
//   }

//   stop() {
//     console.log("Stopping consultation scheduler...");
//     this.intervals.forEach((interval, key) => {
//       clearInterval(interval);
//     });
//     this.intervals.clear();
//   }

//   async checkExpiringConsultations() {
//     try {
//       const now = new Date();

//       // Find active consultations that have expired
//       const expiredConsultations = await prisma.consultation.findMany({
//         where: {
//           isActive: true,
//           expiresAt: {
//             lte: now,
//           },
//         },
//         include: {
//           patient: {
//             select: {
//               id: true,
//               fullname: true,
//             },
//           },
//           doctor: {
//             select: {
//               id: true,
//               fullname: true,
//             },
//           },
//         },
//       });

//       if (expiredConsultations.length > 0) {
//         console.log(
//           `Found ${expiredConsultations.length} expired consultations`
//         );

//         // Update consultations to inactive
//         const consultationIds = expiredConsultations.map((c) => c.id);
//         await prisma.consultation.updateMany({
//           where: {
//             id: {
//               in: consultationIds,
//             },
//           },
//           data: {
//             isActive: false,
//           },
//         });

//         // Notify via Socket.IO
//         const { getIO } = require("../chatSocket");
//         try {
//           const io = getIO();
//           expiredConsultations.forEach((consultation) => {
//             const roomName = `consultation:${consultation.id}`;
//             io.to(roomName).emit("consultation_status", {
//               isActive: false,
//               expired: true,
//               message: "Consultation has expired",
//             });
//           });
//         } catch (socketError) {
//           console.error("Socket.IO broadcast error:", socketError.message);
//         }

//         console.log(
//           `Deactivated ${expiredConsultations.length} expired consultations`
//         );
//       }
//     } catch (error) {
//       console.error("Error checking expiring consultations:", error);
//     }
//   }

//   async checkConsultationsExpiringSoon() {
//     try {
//       const now = new Date();
//       const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

//       // Find active consultations expiring in the next 5 minutes
//       const expiringSoonConsultations = await prisma.consultation.findMany({
//         where: {
//           isActive: true,
//           expiresAt: {
//             gte: now,
//             lte: fiveMinutesLater,
//           },
//         },
//         include: {
//           patient: {
//             select: {
//               id: true,
//               fullname: true,
//             },
//           },
//           doctor: {
//             select: {
//               id: true,
//               fullname: true,
//             },
//           },
//         },
//       });

//       if (expiringSoonConsultations.length > 0) {
//         console.log(
//           `Found ${expiringSoonConsultations.length} consultations expiring soon`
//         );

//         // Notify via Socket.IO
//         const { getIO } = require("../chatSocket");
//         try {
//           const io = getIO();
//           expiringSoonConsultations.forEach((consultation) => {
//             const timeRemaining = Math.ceil(
//               (consultation.expiresAt.getTime() - now.getTime()) / 60000
//             );
//             const roomName = `consultation:${consultation.id}`;

//             io.to(roomName).emit("consultation_expiring_soon", {
//               consultationId: consultation.id,
//               message: `Consultation will expire in ${timeRemaining} minutes`,
//               timeRemaining,
//               expiresAt: consultation.expiresAt,
//             });
//           });
//         } catch (socketError) {
//           console.error("Socket.IO notification error:", socketError.message);
//         }
//       }
//     } catch (error) {
//       console.error("Error checking consultations expiring soon:", error);
//     }
//   }

//   // Manual cleanup of old inactive consultations (run daily)
//   async cleanupOldConsultations() {
//     try {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//       const result = await prisma.consultation.deleteMany({
//         where: {
//           isActive: false,
//           expiresAt: {
//             lt: sevenDaysAgo,
//           },
//         },
//       });

//       console.log(`Cleaned up ${result.count} old consultations`);
//       return result.count;
//     } catch (error) {
//       console.error("Error cleaning up old consultations:", error);
//       return 0;
//     }
//   }

//   // Get consultation statistics
//   async getConsultationStats() {
//     try {
//       const [
//         totalConsultations,
//         activeConsultations,
//         todayConsultations,
//         completedConsultations,
//       ] = await Promise.all([
//         prisma.consultation.count(),
//         prisma.consultation.count({
//           where: { isActive: true },
//         }),
//         prisma.consultation.count({
//           where: {
//             startedAt: {
//               gte: new Date(new Date().setHours(0, 0, 0, 0)),
//             },
//           },
//         }),
//         prisma.consultation.count({
//           where: { isActive: false },
//         }),
//       ]);

//       return {
//         total: totalConsultations,
//         active: activeConsultations,
//         today: todayConsultations,
//         completed: completedConsultations,
//         timestamp: new Date(),
//       };
//     } catch (error) {
//       console.error("Error getting consultation stats:", error);
//       return null;
//     }
//   }
// }

// module.exports = ConsultationScheduler;
