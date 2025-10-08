const prisma = require("../config/database");
const path = require("path");
const fs = require("fs");

class NewsController {
  // ✅ GET all news
  async getAllNews(req, res, next) {
    try {
      const news = await prisma.news.findMany({
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: news.map((n) => ({
          ...n,
          imageUrl: n.image
            ? `${req.protocol}://${req.get("host")}/uploads/news/${n.image}`
            : null,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ GET single news
  async getNewsById(req, res, next) {
    try {
      const { id } = req.params;
      const news = await prisma.news.findUnique({ where: { id } });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "News not found",
        });
      }

      res.json({
        success: true,
        data: {
          ...news,
          imageUrl: news.image
            ? `${req.protocol}://${req.get("host")}/uploads/news/${news.image}`
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ CREATE news (accept Base64 image)
  async createNews(req, res, next) {
    try {
      const { title, content, imageBase64 } = req.body;
      let imageFilename = null;

      if (imageBase64) {
        // Decode base64 dan simpan ke file lokal
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Tentukan ekstensi berdasarkan MIME type
        const ext = imageBase64.startsWith("data:image/png") ? "png" : "jpg";
        imageFilename = `${Date.now()}.${ext}`;
        const filePath = path.join(__dirname, "../uploads/news", imageFilename);

        // Pastikan folder ada
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, buffer);
      }

      const news = await prisma.news.create({
        data: {
          title,
          content,
          image: imageFilename,
        },
      });

      res.status(201).json({
        success: true,
        message: "News created successfully",
        data: {
          ...news,
          imageUrl: imageFilename
            ? `${req.protocol}://${req.get("host")}/uploads/news/${imageFilename}`
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ UPDATE news (accept Base64 image)
  async updateNews(req, res, next) {
    try {
      const { id } = req.params;
      const { title, content, imageBase64 } = req.body;

      const existing = await prisma.news.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "News not found",
        });
      }

      let imageFilename = existing.image;

      if (imageBase64) {
        // Hapus gambar lama
        if (imageFilename) {
          const oldPath = path.join(__dirname, "../uploads/news", imageFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        // Simpan gambar baru
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = imageBase64.startsWith("data:image/png") ? "png" : "jpg";
        imageFilename = `${Date.now()}.${ext}`;
        const filePath = path.join(__dirname, "../uploads/news", imageFilename);
        fs.writeFileSync(filePath, buffer);
      }

      const updated = await prisma.news.update({
        where: { id },
        data: { title, content, image: imageFilename },
      });

      res.json({
        success: true,
        message: "News updated successfully",
        data: {
          ...updated,
          imageUrl: imageFilename
            ? `${req.protocol}://${req.get("host")}/uploads/news/${imageFilename}`
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ✅ DELETE news
  async deleteNews(req, res, next) {
    try {
      const { id } = req.params;

      const news = await prisma.news.findUnique({ where: { id } });
      if (!news) {
        return res.status(404).json({
          success: false,
          message: "News not found",
        });
      }

      if (news.image) {
        const imagePath = path.join(__dirname, "../uploads/news", news.image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }

      await prisma.news.delete({ where: { id } });

      res.json({
        success: true,
        message: "News deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NewsController();
