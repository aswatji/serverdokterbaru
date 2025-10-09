const prisma = require("../config/database");

class ConsultationController {
  // ✅ Get all consultations
  async getAllConsultations(req, res, next) {
    try {
      const { patientId, doctorId, isActive } = req.query;
      const where = {};
      if (patientId) where.patientId = patientId;
      if (doctorId) where.doctorId = doctorId;
      if (isActive !== undefined) where.isActive = isActive === "true";

      const consultations = await prisma.consultation.findMany({
        where,
        include: {
          patient: {
            select: { id: true, fullname: true, email: true, photo: true },
          },
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          payment: true,
          chat: {
            include: {
              _count: { select: { messages: true } },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      });

      res.json({ success: true, data: consultations });
    } catch (error) {
      console.error("❌ Error getAllConsultations:", error);
      next(error);
    }
  }

  // ✅ Get consultation by ID
  async getConsultationById(req, res, next) {
    try {
      const { id } = req.params;
      const consultation = await prisma.consultation.findUnique({
        where: { id },
        include: {
          patient: {
            select: { id: true, fullname: true, email: true, photo: true },
          },
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          payment: true,
          chat: {
            include: {
              messages: {
                include: {
                  user: { select: { id: true, fullname: true, photo: true } },
                  doctor: { select: { id: true, fullname: true, photo: true } },
                },
                orderBy: { sentAt: "asc" },
              },
            },
          },
        },
      });

      if (!consultation)
        return res
          .status(404)
          .json({ success: false, message: "Consultation not found" });

      res.json({ success: true, data: consultation });
    } catch (error) {
      console.error("❌ Error getConsultationById:", error);
      next(error);
    }
  }

  // ✅ Create new consultation
  async createConsultation(req, res, next) {
    try {
      console.log("📩 Consultation request body:", req.body);
      const { patientId, doctorId, paymentId, duration = 30 } = req.body;

      if (!patientId || !doctorId || !paymentId) {
        return res.status(400).json({
          success: false,
          message: "patientId, doctorId, and paymentId are required",
        });
      }

      // 🔍 Cek apakah paymentId sudah pernah digunakan
      const existing = await prisma.consultation.findUnique({
        where: { paymentId },
        include: {
          chat: true,
          payment: true,
          patient: true,
          doctor: true,
        },
      });

      if (existing) {
        const now = new Date();
        const isExpired = new Date(existing.expiresAt) <= now;

        if (isExpired) {
          console.log("⚠️ Existing consultation found but expired.");
          return res.status(403).json({
            success: false,
            error: "consultation_expired",
            message:
              "Konsultasi telah berakhir. Silakan lakukan pembayaran baru.",
            data: existing,
          });
        }

        console.log("✅ Existing active consultation found:", existing.id);
        return res.status(200).json({
          success: true,
          message: "Consultation already exists and still active.",
          data: existing,
        });
      }

      // 🕒 Tentukan waktu berakhir konsultasi (default 30 menit)
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      // 🧠 Buat consultation baru
      const consultation = await prisma.consultation.create({
        data: { patientId, doctorId, paymentId, expiresAt },
        include: {
          patient: {
            select: { id: true, fullname: true, email: true, photo: true },
          },
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          payment: true,
        },
      });

      // 💬 Buat chat baru untuk consultation
      const chat = await prisma.chat.create({
        data: { consultationId: consultation.id },
      });

      console.log("✅ New consultation created:", consultation.id);

      return res.status(201).json({
        success: true,
        message: "Consultation and chat created successfully",
        data: {
          ...consultation,
          chat,
        },
      });
    } catch (error) {
      console.error("❌ Error creating consultation:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during consultation creation",
        error: error.message,
      });
    }
  }

  // ✅ Update consultation
  async updateConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentId, expiresAt, isActive } = req.body;
      const updateData = {};

      if (paymentId !== undefined) updateData.paymentId = paymentId;
      if (expiresAt) updateData.expiresAt = new Date(expiresAt);
      if (isActive !== undefined) updateData.isActive = isActive;

      const consultation = await prisma.consultation.update({
        where: { id },
        data: updateData,
        include: {
          patient: {
            select: { id: true, fullname: true, email: true, photo: true },
          },
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          payment: true,
          chat: { include: { _count: { select: { messages: true } } } },
        },
      });

      res.json({
        success: true,
        message: "Consultation updated successfully",
        data: consultation,
      });
    } catch (error) {
      console.error("❌ Error updateConsultation:", error);
      next(error);
    }
  }

  // ✅ End consultation manually
  async endConsultation(req, res, next) {
    try {
      const { id } = req.params;

      const consultation = await prisma.consultation.update({
        where: { id },
        data: { isActive: false, expiresAt: new Date() },
        include: {
          patient: { select: { id: true, fullname: true, email: true } },
          doctor: { select: { id: true, fullname: true, category: true } },
        },
      });

      res.json({
        success: true,
        message: "Consultation ended successfully",
        data: consultation,
      });
    } catch (error) {
      console.error("❌ Error endConsultation:", error);
      next(error);
    }
  }

  // ✅ Delete consultation
  async deleteConsultation(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.consultation.delete({ where: { id } });

      res.json({
        success: true,
        message: "Consultation deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleteConsultation:", error);
      next(error);
    }
  }
}

module.exports = new ConsultationController();
