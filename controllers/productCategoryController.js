import { PrismaClient } from "@prisma/client";
import redis from "../utils/redisClient.js";

const prisma = new PrismaClient();

const KEY = "product_categories:all"; // Satu key untuk semua kategori produk
const TTL = 3600;                     // 1 jam — kategori sangat jarang berubah

class ProductCategoryController {
  // ✅ 1. Membuat Kategori Produk Baru → Invalidate cache
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Nama kategori produk wajib diisi",
        });
      }

      const existingCategory = await prisma.productCategory.findUnique({
        where: { name },
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: "Kategori produk dengan nama ini sudah ada",
        });
      }

      const category = await prisma.productCategory.create({
        data: { name, description },
      });

      // 🗑️ Invalidate cache list kategori
      await redis.del(KEY);

      res.status(201).json({
        success: true,
        message: "Kategori produk berhasil dibuat",
        data: category,
      });
    } catch (error) {
      console.error("❌ Create Product Category Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 2. Mengambil Semua Kategori Produk → Cache 1 jam
  async getAllCategories(req, res) {
    try {
      // ── Cache HIT ──
      const cached = await redis.get(KEY);
      if (cached) {
        console.log(`✅ Cache HIT: ${KEY}`);
        return res.status(200).json({
          success: true,
          source: "cache",
          data: JSON.parse(cached),
        });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${KEY}`);
      const categories = await prisma.productCategory.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: { select: { products: true } },
        },
      });

      await redis.setEx(KEY, TTL, JSON.stringify(categories));

      res.status(200).json({ success: true, source: "db", data: categories });
    } catch (error) {
      console.error("❌ Get Product Categories Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 3. Mengupdate Kategori Produk → Invalidate cache
  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const existingCategory = await prisma.productCategory.findUnique({
        where: { id },
      });
      if (!existingCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Kategori produk tidak ditemukan" });
      }

      const updatedCategory = await prisma.productCategory.update({
        where: { id },
        data: { name, description },
      });

      // 🗑️ Invalidate — nama kategori mungkin berubah, ikut cache produk juga
      await redis.del(KEY);
      await redis.del("products:home");

      res.status(200).json({
        success: true,
        message: "Kategori produk berhasil diupdate",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("❌ Update Product Category Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 4. Menghapus Kategori Produk → Invalidate cache
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const existingCategory = await prisma.productCategory.findUnique({
        where: { id },
      });
      if (!existingCategory) {
        return res
          .status(404)
          .json({ success: false, message: "Kategori produk tidak ditemukan" });
      }

      await prisma.productCategory.delete({ where: { id } });

      // 🗑️ Invalidate kategori dan produk (produk mungkin terpengaruh)
      await redis.del(KEY);
      await redis.del("products:home");
      const productKeys = await redis.keys("products:all*");
      if (productKeys?.length > 0) await redis.del(productKeys);

      res
        .status(200)
        .json({ success: true, message: "Kategori produk berhasil dihapus" });
    } catch (error) {
      console.error("❌ Delete Product Category Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ProductCategoryController();
