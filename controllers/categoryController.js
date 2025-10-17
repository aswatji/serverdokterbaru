// controllers/categoryController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class CategoryController {
  // ✅ Ambil semua kategori
  async getAll(req, res) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("❌ Error getAll categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  // ✅ Tambah kategori baru
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

  // ✅ Update kategori
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, items } = req.body;

      const category = await prisma.category.update({
        where: { id },
        data: { name, items },
      });

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

  // ✅ Hapus kategori
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.category.delete({ where: { id } });

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

export default CategoryController();
