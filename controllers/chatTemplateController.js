import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ChatTemplateController {
  /**
   * 📋 GET All Templates (by Doctor)
   * @route GET /api/chat-templates
   */
  async getTemplates(req, res) {
    try {
      const { id: doctorId, type } = req.user;

      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Hanya dokter yang bisa mengakses template",
        });
      }

      const templates = await prisma.chatTemplate.findMany({
        where: { doctorId },
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      });

      // Group by category
      const grouped = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {});

      return res.status(200).json({
        success: true,
        data: {
          templates,
          grouped,
        },
      });
    } catch (error) {
      console.error("❌ Error getTemplates:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil template",
        error: error.message,
      });
    }
  }

  /**
   * 📋 GET Template by ID
   * @route GET /api/chat-templates/:id
   */
  async getTemplateById(req, res) {
    try {
      const { id: doctorId, type } = req.user;
      const { id } = req.params;

      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Hanya dokter yang bisa mengakses template",
        });
      }

      const template = await prisma.chatTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Template tidak ditemukan",
        });
      }

      if (template.doctorId !== doctorId) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak berhak mengakses template ini",
        });
      }

      return res.status(200).json({
        success: true,
        data: template,
      });
    } catch (error) {
      console.error("❌ Error getTemplateById:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil template",
        error: error.message,
      });
    }
  }

  /**
   * ➕ CREATE New Template
   * @route POST /api/chat-templates
   */
  async createTemplate(req, res) {
    try {
      const { id: doctorId, type } = req.user;
      const { category, title, content } = req.body;

      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Hanya dokter yang bisa membuat template",
        });
      }

      // Validation
      if (!category || !title || !content) {
        return res.status(400).json({
          success: false,
          message: "category, title, dan content wajib diisi",
        });
      }

      const validCategories = [
        "etiket",
        "anamnesis",
        "penjelasan",
        "pelaksanaan",
        "lab",
        "quick",
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Category harus salah satu dari: ${validCategories.join(
            ", "
          )}`,
        });
      }

      // Check duplicate
      const existing = await prisma.chatTemplate.findFirst({
        where: {
          doctorId,
          category,
          title,
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: "Template dengan judul dan kategori yang sama sudah ada",
        });
      }

      const template = await prisma.chatTemplate.create({
        data: {
          doctorId,
          category,
          title,
          content,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Template berhasil dibuat",
        data: template,
      });
    } catch (error) {
      console.error("❌ Error createTemplate:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal membuat template",
        error: error.message,
      });
    }
  }

  /**
   * ✏️ UPDATE Template
   * @route PUT /api/chat-templates/:id
   */
  async updateTemplate(req, res) {
    try {
      const { id: doctorId, type } = req.user;
      const { id } = req.params;
      const { category, title, content } = req.body;

      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Hanya dokter yang bisa mengupdate template",
        });
      }

      // Check ownership
      const existing = await prisma.chatTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Template tidak ditemukan",
        });
      }

      if (existing.doctorId !== doctorId) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak berhak mengupdate template ini",
        });
      }

      // Validate category if provided
      if (category) {
        const validCategories = [
          "etiket",
          "anamnesis",
          "penjelasan",
          "pelaksanaan",
          "lab",
          "quick",
        ];
        if (!validCategories.includes(category)) {
          return res.status(400).json({
            success: false,
            message: `Category harus salah satu dari: ${validCategories.join(
              ", "
            )}`,
          });
        }
      }

      const template = await prisma.chatTemplate.update({
        where: { id },
        data: {
          ...(category && { category }),
          ...(title && { title }),
          ...(content && { content }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Template berhasil diupdate",
        data: template,
      });
    } catch (error) {
      console.error("❌ Error updateTemplate:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengupdate template",
        error: error.message,
      });
    }
  }

  /**
   * 🗑️ DELETE Template
   * @route DELETE /api/chat-templates/:id
   */
  async deleteTemplate(req, res) {
    try {
      const { id: doctorId, type } = req.user;
      const { id } = req.params;

      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Hanya dokter yang bisa menghapus template",
        });
      }

      const existing = await prisma.chatTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Template tidak ditemukan",
        });
      }

      if (existing.doctorId !== doctorId) {
        return res.status(403).json({
          success: false,
          message: "Anda tidak berhak menghapus template ini",
        });
      }

      await prisma.chatTemplate.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: "Template berhasil dihapus",
      });
    } catch (error) {
      console.error("❌ Error deleteTemplate:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal menghapus template",
        error: error.message,
      });
    }
  }
}

export default new ChatTemplateController();
