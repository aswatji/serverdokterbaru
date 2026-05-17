import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class ProductCategoryController {
  // ✅ 1. Membuat Kategori Produk Baru
  async createCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Nama kategori produk wajib diisi",
        });
      }

      // Cek apakah nama kategori sudah ada
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

  // ✅ 2. Mengambil Semua Kategori Produk
  async getAllCategories(req, res) {
    try {
      const categories = await prisma.productCategory.findMany({
        orderBy: { name: "asc" },
        include: {
          // Menghitung jumlah produk di masing-masing kategori
          _count: {
            select: { products: true },
          },
        },
      });

      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      console.error("❌ Get Product Categories Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 3. Mengupdate Kategori Produk
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

  // ✅ 4. Menghapus Kategori Produk
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
