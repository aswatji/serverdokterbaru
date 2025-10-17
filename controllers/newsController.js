// controllers/newsController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class NewsController {
  // ✅ Ambil semua berita
  async getAll(req, res) {
    try {
      const newsList = await prisma.news.findMany({
        orderBy: { createdAt: "desc" },
      });

      res.json({
        success: true,
        data: newsList,
      });
    } catch (error) {
      console.error("❌ Error getAll news:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch news",
        error: error.message,
      });
    }
  }

  // ✅ Ambil berita berdasarkan ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const news = await prisma.news.findUnique({
        where: { id },
      });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "News not found",
        });
      }

      res.json({
        success: true,
        data: news,
      });
    } catch (error) {
      console.error("❌ Error getById news:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch news",
        error: error.message,
      });
    }
  }

  // ✅ Tambah berita baru
  async create(req, res) {
    try {
      const { title, content, image } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "Title and content are required",
        });
      }

      const news = await prisma.news.create({
        data: { title, content, image },
      });

      res.status(201).json({
        success: true,
        message: "News created successfully",
        data: news,
      });
    } catch (error) {
      console.error("❌ Error create news:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create news",
        error: error.message,
      });
    }
  }

  // ✅ Update berita
  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, content, image } = req.body;

      const news = await prisma.news.update({
        where: { id },
        data: { title, content, image },
      });

      res.json({
        success: true,
        message: "News updated successfully",
        data: news,
      });
    } catch (error) {
      console.error("❌ Error update news:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update news",
        error: error.message,
      });
    }
  }

  // ✅ Hapus berita
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.news.delete({ where: { id } });

      res.json({
        success: true,
        message: "News deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error delete news:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete news",
        error: error.message,
      });
    }
  }
}

export default new NewsController();
