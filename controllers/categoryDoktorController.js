const prisma = require("../config/database");

class CategoryDoktorController {
  // ambil semua kategori
  async getAll(req, res, next) {
    try {
      const categories = await prisma.categoryDoktor.findMany({
        orderBy: { id: "asc" },
      });
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  // ambil kategori by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await prisma.categoryDoktor.findUnique({
        where: { id: Number(id) },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  // buat kategori baru
  async create(req, res, next) {
    try {
      const { category } = req.body;

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      const newCategory = await prisma.categoryDoktor.create({
        data: { category },
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: newCategory,
      });
    } catch (error) {
      next(error);
    }
  }

  // update kategori
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { category } = req.body;

      const updated = await prisma.categoryDoktor.update({
        where: { id: Number(id) },
        data: { category },
      });

      res.json({
        success: true,
        message: "Category updated successfully",
        data: updated,
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      next(error);
    }
  }

  // hapus kategori
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.categoryDoktor.delete({
        where: { id: Number(id) },
      });

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }
      next(error);
    }
  }
}

module.exports = new CategoryDoktorController();
