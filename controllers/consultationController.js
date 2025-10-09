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
      next(error);
    }
  }

  // ✅ Create new consultation (return chat + patient + doctor)
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

      // Cegah duplikat consultation untuk payment yang sama
      const existing = await prisma.consultation.findUnique({
        where: { paymentId },
        include: { chat: true },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          error: "paymentId already exists",
          data: existing,
        });
      }

      const expiresAt = new Date(Date.now() + duration * 60 * 1000); // 30 minutes default

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

      // 🔹 Buat chat untuk consultation ini
      const chat = await prisma.chat.create({
        data: { consultationId: consultation.id },
      });

      // 🔹 Return langsung consultation + chat
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
      next(error);
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
      next(error);
    }
  }

  // ✅ End consultation
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
      next(error);
    }
  }

  // ✅ Delete consultation
  async deleteConsultation(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.consultation.delete({ where: { id } });

      res.json({ success: true, message: "Consultation deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsultationController();
