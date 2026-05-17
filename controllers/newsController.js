// controllers/newsController.js
import { PrismaClient } from "@prisma/client";
import redisClient from "../utils/redisClient.js"; // 👈 Import Redis

const prisma = new PrismaClient();

class NewsController {
  // ✅ Ambil semua berita
  async getAll(req, res) {
    try {
      const cacheKey = "news:all";

      // ⚡ 1. Cek Cache Redis
      const cachedNews = await redisClient.get(cacheKey);
      if (cachedNews) {
        console.log("⚡ Fetching News from REDIS");
        return res.json({
          success: true,
          data: JSON.parse(cachedNews),
        });
      }

      // 🔍 2. Jika tidak ada, ambil dari Database
      console.log("🔍 Fetching News from DATABASE");
      const newsList = await prisma.news.findMany({
        orderBy: { createdAt: "desc" },
      });

      // 📦 3. Simpan ke Redis (Cache 24 jam / 86400 detik)
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(newsList));

      res.json({
        success: true,
        data: newsList,
      });
    } catch (error) {
      console.error("❌ Error getAll news:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Ambil berita berdasarkan ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `news:detail:${id}`;

      // ⚡ 1. Cek Cache Redis
      const cachedDetail = await redisClient.get(cacheKey);
      if (cachedDetail) {
        console.log(`⚡ Fetching News Detail ${id} from REDIS`);
        return res.json({ success: true, data: JSON.parse(cachedDetail) });
      }

      // 🔍 2. Ambil dari DB
      const news = await prisma.news.findUnique({
        where: { id },
      });

      if (!news) {
        return res
          .status(404)
          .json({ success: false, message: "News not found" });
      }

      // 📦 3. Simpan detail ke Redis (24 Jam)
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(news));

      res.json({ success: true, data: news });
    } catch (error) {
      console.error("❌ Error getById news:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Tambah berita baru
  async create(req, res) {
    try {
      const { title, content, image } = req.body;
      if (!title || !content)
        return res
          .status(400)
          .json({ success: false, message: "Title and content required" });

      const news = await prisma.news.create({
        data: { title, content, image },
      });

      // 🗑️ INVALIDASI: Hapus list semua berita agar update
      await redisClient.del("news:all");

      res.status(201).json({ success: true, data: news });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
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

      // 🗑️ INVALIDASI: Hapus list semua berita DAN detail berita ini
      await redisClient.del("news:all");
      await redisClient.del(`news:detail:${id}`);

      res.json({ success: true, data: news });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Hapus berita
  async delete(req, res) {
    try {
      const { id } = req.params;
      await prisma.news.delete({ where: { id } });

      // 🗑️ INVALIDASI: Hapus cache
      await redisClient.del("news:all");
      await redisClient.del(`news:detail:${id}`);

      res.json({ success: true, message: "News deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async clearCache(req, res) {
    try {
      await redisClient.del("news:all");
      res.json({
        success: true,
        message: "Cache berita berhasil dibersihkan!",
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new NewsController();
