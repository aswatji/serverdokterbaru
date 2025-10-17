// controllers/categoryDoctorController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

class CategoryDoctorController {
  // ✅ Ambil semua kategori dokter
  async getAll(req, res) {
    try {
      const categories = await prisma.categoryDoctor.findMany({
        orderBy: { category: "asc" },
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("❌ Error getAll doctor categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch doctor categories",
        error: error.message,
      });
    }
  }

  // ✅ Tambah kategori dokter baru
  async create(req, res) {
    try {
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const newCategory = await prisma.categoryDoctor.create({
        data: { category },
      });

      res.status(201).json({
        success: true,
        message: "Doctor category created successfully",
        data: newCategory,
      });
    } catch (error) {
      console.error("❌ Error create doctor category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create doctor category",
        error: error.message,
      });
    }
  }

  // ✅ Update kategori dokter
  async update(req, res) {
    try {
      const { id } = req.params;
      const { category } = req.body;

      const updated = await prisma.categoryDoctor.update({
        where: { id: Number(id) },
        data: { category },
      });

      res.json({
        success: true,
        message: "Doctor category updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("❌ Error update doctor category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update doctor category",
        error: error.message,
      });
    }
  }

  // ✅ Hapus kategori dokter
  async delete(req, res) {
    try {
      const { id } = req.params;

      await prisma.categoryDoctor.delete({
        where: { id: Number(id) },
      });

      res.json({
        success: true,
        message: "Doctor category deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error delete doctor category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete doctor category",
        error: error.message,
      });
    }
  }
}

export default CategoryDoctorController();
