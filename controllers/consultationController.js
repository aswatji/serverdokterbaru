const prisma = require("../config/database");

class ConsultationController {
  async getActiveConsultation(req, res, next) {
    try {
      const { userId, doctorId } = req.params;

      // Cari konsultasi aktif
      const consultation = await prisma.consultation.findFirst({
        where: {
          patientId: parseInt(userId),
          doctorId: parseInt(doctorId),
          isActive: true,
          expiresAt: { gt: new Date() }, // belum expired
        },
        include: {
          chat: {
            include: {
              messages: {
                orderBy: { createdAt: "asc" },
                include: {
                  user: { select: { id: true, fullname: true, photo: true } },
                  doctor: { select: { id: true, fullname: true, photo: true } },
                },
              },
            },
          },
          doctor: {
            select: { id: true, fullname: true, category: true, photo: true },
          },
          patient: {
            select: { id: true, fullname: true, photo: true },
          },
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Tidak ada konsultasi aktif ditemukan",
        });
      }

      res.status(200).json({
        success: true,
        data: consultation,
      });
    } catch (error) {
      console.error("Error getActiveConsultation:", error);
      next(error);
    }
  }

  // Get all consultations
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
            select: {
              id: true,
              fullname: true,
              email: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          payment: true,
          chat: {
            include: {
              _count: {
                select: { messages: true },
              },
            },
          },
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      res.json({
        success: true,
        data: consultations,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get consultation by ID
  async getConsultationById(req, res, next) {
    try {
      const { id } = req.params;
      const consultation = await prisma.consultation.findUnique({
        where: { id: id },
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
              email: true,
              photo: true,
              profession: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              bio: true,
              photo: true,
            },
          },
          payment: true,
          chat: {
            include: {
              messages: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullname: true,
                      photo: true,
                    },
                  },
                  doctor: {
                    select: {
                      id: true,
                      fullname: true,
                      photo: true,
                    },
                  },
                },
                orderBy: {
                  sentAt: "asc",
                },
              },
            },
          },
        },
      });

      if (!consultation) {
        return res.status(404).json({
          success: false,
          message: "Consultation not found",
        });
      }

      res.json({
        success: true,
        data: consultation,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new consultation
  async createConsultation(req, res, next) {
    try {
      const { patientId, doctorId, paymentId, duration = 60 } = req.body;

      // Calculate expiration time (default 60 minutes)
      const expiresAt = new Date(Date.now() + duration * 60 * 1000);

      const consultation = await prisma.consultation.create({
        data: {
          patientId,
          doctorId,
          paymentId: paymentId || null,
          expiresAt,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
              email: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          payment: true,
        },
      });

      // Create chat for the consultation
      const chat = await prisma.chat.create({
        data: {
          consultationId: consultation.id,
        },
      });

      res.status(201).json({
        success: true,
        message: "Consultation created successfully",
        data: {
          ...consultation,
          chat,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update consultation
  async updateConsultation(req, res, next) {
    try {
      const { id } = req.params;
      const { paymentId, expiresAt, isActive } = req.body;

      const updateData = {};
      if (paymentId !== undefined) updateData.paymentId = paymentId;
      if (expiresAt) updateData.expiresAt = new Date(expiresAt);
      if (isActive !== undefined) updateData.isActive = isActive;

      const consultation = await prisma.consultation.update({
        where: { id: id },
        data: updateData,
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
              email: true,
              photo: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
              photo: true,
            },
          },
          payment: true,
          chat: {
            include: {
              _count: {
                select: { messages: true },
              },
            },
          },
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

  // End consultation
  async endConsultation(req, res, next) {
    try {
      const { id } = req.params;

      const consultation = await prisma.consultation.update({
        where: { id: id },
        data: {
          isActive: false,
          expiresAt: new Date(), // Set to current time
        },
        include: {
          patient: {
            select: {
              id: true,
              fullname: true,
              email: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
            },
          },
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

  // Delete consultation
  async deleteConsultation(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.consultation.delete({
        where: { id: id },
      });

      res.json({
        success: true,
        message: "Consultation deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsultationController();
