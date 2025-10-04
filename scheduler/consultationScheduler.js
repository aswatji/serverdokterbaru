const prisma = require("../config/database");

class ConsultationScheduler {
  constructor() {
    this.intervals = new Map();
  }

  start() {
    console.log("Starting consultation scheduler...");

    // Check for expiring consultations every minute
    this.intervals.set(
      "expiry-check",
      setInterval(() => {
        this.checkExpiringConsultations();
      }, 60000)
    ); // 60 seconds

    // Check for consultations expiring in 5 minutes (warning)
    this.intervals.set(
      "expiry-warning",
      setInterval(() => {
        this.checkConsultationsExpiringSoon();
      }, 30000)
    ); // 30 seconds
  }

  stop() {
    console.log("Stopping consultation scheduler...");
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.intervals.clear();
  }

  async checkExpiringConsultations() {
    try {
      const now = new Date();

      // Find active consultations that have expired
      const expiredConsultations = await prisma.consultation.findMany({
        where: {
          isActive: true,
          expiresAt: {
            lte: now,
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
            },
          },
        },
      });

      if (expiredConsultations.length > 0) {
        console.log(
          `Found ${expiredConsultations.length} expired consultations`
        );

        // Update consultations to inactive
        const consultationIds = expiredConsultations.map((c) => c.id);
        await prisma.consultation.updateMany({
          where: {
            id: {
              in: consultationIds,
            },
          },
          data: {
            isActive: false,
          },
        });

        // Notify via Socket.IO
        if (global.socketServer) {
          expiredConsultations.forEach((consultation) => {
            global.socketServer.broadcastConsultationStatus(consultation.id, {
              isActive: false,
              expired: true,
              message: "Consultation has expired",
            });
          });
        }

        console.log(
          `Deactivated ${expiredConsultations.length} expired consultations`
        );
      }
    } catch (error) {
      console.error("Error checking expiring consultations:", error);
    }
  }

  async checkConsultationsExpiringSoon() {
    try {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      // Find active consultations expiring in the next 5 minutes
      const expiringSoonConsultations = await prisma.consultation.findMany({
        where: {
          isActive: true,
          expiresAt: {
            gte: now,
            lte: fiveMinutesLater,
          },
        },
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
            },
          },
        },
      });

      if (expiringSoonConsultations.length > 0) {
        console.log(
          `Found ${expiringSoonConsultations.length} consultations expiring soon`
        );

        // Notify via Socket.IO
        if (global.socketServer) {
          expiringSoonConsultations.forEach((consultation) => {
            const timeRemaining = Math.ceil(
              (consultation.expiresAt.getTime() - now.getTime()) / 60000
            );

            global.socketServer.notifyConsultationExpiringSoon(
              consultation.id,
              timeRemaining
            );
          });
        }
      }
    } catch (error) {
      console.error("Error checking consultations expiring soon:", error);
    }
  }

  // Manual cleanup of old inactive consultations (run daily)
  async cleanupOldConsultations() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await prisma.consultation.deleteMany({
        where: {
          isActive: false,
          expiresAt: {
            lt: sevenDaysAgo,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old consultations`);
      return result.count;
    } catch (error) {
      console.error("Error cleaning up old consultations:", error);
      return 0;
    }
  }

  // Get consultation statistics
  async getConsultationStats() {
    try {
      const [
        totalConsultations,
        activeConsultations,
        todayConsultations,
        completedConsultations,
      ] = await Promise.all([
        prisma.consultation.count(),
        prisma.consultation.count({
          where: { isActive: true },
        }),
        prisma.consultation.count({
          where: {
            startedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.consultation.count({
          where: { isActive: false },
        }),
      ]);

      return {
        total: totalConsultations,
        active: activeConsultations,
        today: todayConsultations,
        completed: completedConsultations,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error getting consultation stats:", error);
      return null;
    }
  }
}

module.exports = ConsultationScheduler;
