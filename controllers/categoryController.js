// controllers/categoryController.js
import { PrismaClient } from "@prisma/client";
import redis from "../utils/redisClient.js";

const prisma = new PrismaClient();

const KEY = "categories:all"; // Satu key cukup — data kategori sangat jarang berubah
const TTL = 3600;             // 1 jam

class CategoryController {
  // ✅ Ambil semua kategori → Cache 1 jam
  async getAll(req, res) {
    try {
      // ── Cache HIT ──
      const cached = await redis.get(KEY);
      if (cached) {
        console.log(`✅ Cache HIT: ${KEY}`);
        return res.json({ success: true, source: "cache", data: JSON.parse(cached) });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${KEY}`);
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
      });

      await redis.setEx(KEY, TTL, JSON.stringify(categories));

      res.json({ success: true, source: "db", data: categories });
    } catch (error) {
      console.error("❌ Error getAll categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  // ✅ Tambah kategori baru → Invalidate cache
  async create(req, res) {
    try {
      const { name, items } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const category = await prisma.category.create({
        data: { name, items },
      });

      // 🗑️ Invalidate
      await redis.del(KEY);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      console.error("❌ Error create category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create category",
        error: error.message,
      });
    }
  }

  // ✅ Update kategori → Invalidate cache
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, items } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: { name, items },
      });

      // 🗑️ Invalidate
      await redis.del(KEY);

      res.json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      console.error("❌ Error update category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update category",
        error: error.message,
      });
    }
  }

  // ✅ Hapus kategori → Invalidate cache
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.category.delete({ where: { id } });

      // 🗑️ Invalidate
      await redis.del(KEY);

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error delete category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete category",
        error: error.message,
      });
    }
  }
}

export default new CategoryController();
