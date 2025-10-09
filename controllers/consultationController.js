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

      return res.json({ success: true, data: consultations });
    } catch (error) {
      console.error("❌ Error fetching consultations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch consultations",
        error: error.message,
      });
    }
  }

  // ✅ Get consultation by ID
  async getConsultationById(req, res) {
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

      if (!consultation) {
        return res
          .status(404)
          .json({ success: false, message: "Consultation not found" });
      }

      return res.json({ success: true, data: consultation });
    } catch (error) {
      console.error("❌ Error getting consultation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get consultation",
        error: error.message,
      });
    }
  }

  // ✅ Create new consultation (final & stable)
  async createConsultation(req, res) {
    try {
      console.log("📩 Consultation request body:", req.body);
      const { patientId, doctorId, paymentId, duration = 30 } = req.body;

      // 🔍 Validasi data wajib
      if (!patientId || !doctorId || !paymentId) {
        return res.status(400).json({
          success: false,
          message: "patientId, doctorId, and paymentId are required",
        });
      }

      // 🔍 Cek apakah paymentId sudah digunakan
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
          console.log("⚠️ Existing consultation expired.");
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

      // 🔹 Hitung waktu expired (default 30 menit)
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      // 🔹 Buat consultation baru
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

      // 🔹 Buat chat (hindari duplikat)
      let chat = await prisma.chat.findUnique({
        where: { consultationId: consultation.id },
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: { consultationId: consultation.id },
        });
        console.log("💬 Chat created:", chat.id);
      }

      console.log("✅ Consultation created successfully:", consultation.id);

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
  async updateConsultation(req, res) {
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

      return res.json({
        success: true,
        message: "Consultation updated successfully",
        data: consultation,
      });
    } catch (error) {
      console.error("❌ Error updating consultation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update consultation",
        error: error.message,
      });
    }
  }

  // ✅ End consultation manually
  async endConsultation(req, res) {
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

      return res.json({
        success: true,
        message: "Consultation ended successfully",
        data: consultation,
      });
    } catch (error) {
      console.error("❌ Error ending consultation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to end consultation",
        error: error.message,
      });
    }
  }

  // ✅ Delete consultation
  async deleteConsultation(req, res) {
    try {
      const { id } = req.params;
      await prisma.consultation.delete({ where: { id } });

      return res.json({
        success: true,
        message: "Consultation deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error deleting consultation:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete consultation",
        error: error.message,
      });
    }
  }
}

module.exports = new ConsultationController();
