const cron = require("node-cron");

class ConsultationScheduler {
  constructor(prismaInstance = null) {
    this.jobs = new Map();
    this.runningJobs = new Set();
    this.prisma = prismaInstance;
  }

  async initialize(prismaInstance = null) {
    try {
      if (prismaInstance) {
        this.prisma = prismaInstance;
      } else {
        this.prisma = require("../config/database");
      }

      // Test prisma connection by doing a simple query
      await this.prisma.$queryRaw`SELECT 1`;
      console.log("✅ Prisma client initialized and tested for scheduler");
      return true;
    } catch (error) {
      console.error(
        "❌ Failed to initialize Prisma client for scheduler:",
        error
      );
      return false;
    }
  }

  async start() {
    console.log("🔄 Initializing Consultation Scheduler...");

    const initialized = await this.initialize();
    if (!initialized) {
      console.error("❌ Cannot start scheduler without Prisma client");
      return;
    }

    console.log("✅ Consultation Scheduler started");

    // Delay starting cron jobs to ensure everything is ready
    setTimeout(() => {
      this.jobs.set(
        "expiry-check",
        cron.schedule("* * * * *", () =>
          this.runSafeJob(
            "expiry-check",
            this.checkExpiringConsultations.bind(this)
          )
        )
      );

      this.jobs.set(
        "expiry-warning",
        cron.schedule("*/30 * * * * *", () =>
          this.runSafeJob(
            "expiry-warning",
            this.checkConsultationsExpiringSoon.bind(this)
          )
        )
      );

      this.jobs.set(
        "cleanup",
        cron.schedule("0 0 * * *", () =>
          this.runSafeJob("cleanup", this.cleanupOldConsultations.bind(this))
        )
      );

      this.jobs.forEach((job) => job.start());
      console.log("⏰ All cron jobs started");
    }, 2000); // Wait 2 more seconds after initialization
  }

  stop() {
    console.log(" Consultation Scheduler stopped");
    this.jobs.forEach((job) => job.stop());
    this.jobs.clear();
  }

  // Helper method to ensure Prisma is available
  async ensurePrismaConnection() {
    console.log("🔍 Debug ensurePrismaConnection:");
    console.log("- this:", !!this);
    console.log("- this.prisma:", !!this.prisma);
    console.log("- typeof this.prisma:", typeof this.prisma);
    console.log(
      "- this.prisma.consultation:",
      !!(this.prisma && this.prisma.consultation)
    );

    if (!this.prisma) {
      console.log("🔄 Re-initializing Prisma connection...");
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }

    if (!this.prisma || !this.prisma.consultation) {
      console.error("❌ Prisma client or consultation model not available");
      return false;
    }

    return true;
  }

  async runSafeJob(name, fn) {
    if (this.runningJobs.has(name)) return;
    this.runningJobs.add(name);

    const start = Date.now();
    try {
      await fn();
    } catch (err) {
      console.error(` Error in job ${name}:`, err);
    } finally {
      this.runningJobs.delete(name);
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      console.log(` [${name}] finished in ${elapsed}s`);
    }
  }

  async checkExpiringConsultations() {
    // DISABLED: Consultation model tidak ada di schema Prisma
    console.log("⚠️ Consultation model tidak tersedia - skipping expiry check");
    return;

    /* ORIGINAL CODE - DISABLED
    const prismaReady = await this.ensurePrismaConnection();
    if (!prismaReady) {
      console.error("❌ Prisma not ready for checkExpiringConsultations");
      return;
    }

    try {
      const now = new Date();
      const expired = await this.prisma.consultation.findMany({
        where: { isActive: true, expiresAt: { lte: now } },
        select: { id: true },
      });

      if (!expired.length) return;

      console.log(`⚠️ Found ${expired.length} expired consultations`);
      const ids = expired.map((c) => c.id);

      await this.prisma.consultation.updateMany({
        where: { id: { in: ids } },
        data: { isActive: false },
      });

      console.log(`✅ Deactivated ${expired.length} consultations`);
    } catch (error) {
      console.error("❌ Error checking expired consultations:", error);
    }
    */
  }

  async checkConsultationsExpiringSoon() {
    // DISABLED: Consultation model tidak ada di schema Prisma
    console.log(
      "⚠️ Consultation model tidak tersedia - skipping expiry warning"
    );
    return;

    /* ORIGINAL CODE - DISABLED
    const prismaReady = await this.ensurePrismaConnection();
    if (!prismaReady) {
      console.error("❌ Prisma not ready for checkConsultationsExpiringSoon");
      return;
    }

    try {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      const soon = await this.prisma.consultation.findMany({
        where: {
          isActive: true,
          expiresAt: { gte: now, lte: fiveMinutesLater },
        },
        select: { id: true, expiresAt: true },
      });

      if (!soon.length) return;

      console.log(`⏳ ${soon.length} consultations expiring soon`);
    } catch (error) {
      console.error("❌ Error checking expiring consultations:", error);
    }
    */
  }

  async cleanupOldConsultations() {
    // DISABLED: Consultation model tidak ada di schema Prisma
    console.log("⚠️ Consultation model tidak tersedia - skipping cleanup");
    return;

    /* ORIGINAL CODE - DISABLED
    const prismaReady = await this.ensurePrismaConnection();
    if (!prismaReady) {
      console.error("❌ Prisma not ready for cleanupOldConsultations");
      return;
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prisma.consultation.deleteMany({
        where: { isActive: false, expiresAt: { lt: sevenDaysAgo } },
      });

      if (result.count > 0) {
        console.log(`🗑️ Cleaned up ${result.count} old consultations`);
      }
    } catch (error) {
      console.error("❌ Error cleaning up consultations:", error);
    }
    */
  }

  async checkConsultationsExpiringSoon() {
    if (!this.prisma) {
      console.error(" Prisma client not available");
      return;
    }

    try {
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

      const soon = await this.prisma.consultation.findMany({
        where: {
          isActive: true,
          expiresAt: { gte: now, lte: fiveMinutesLater },
        },
        select: { id: true, expiresAt: true },
      });

      if (!soon.length) return;

      console.log(` ${soon.length} consultations expiring soon`);
    } catch (error) {
      console.error(" Error checking expiring consultations:", error);
    }
  }

  async cleanupOldConsultations() {
    if (!this.prisma) {
      console.error(" Prisma client not available");
      return;
    }

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prisma.consultation.deleteMany({
        where: { isActive: false, expiresAt: { lt: sevenDaysAgo } },
      });

      if (result.count > 0) {
        console.log(` Cleaned up ${result.count} old consultations`);
      }
    } catch (error) {
      console.error(" Error cleaning up consultations:", error);
    }
  }
}

module.exports = ConsultationScheduler;
