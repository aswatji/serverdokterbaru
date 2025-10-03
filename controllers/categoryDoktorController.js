const prisma = require("../config/database");

class CategoryDoctorController {
  async getAll(req, res, next) {
    try {
      const categories = await prisma.categoryDoctor.findMany({ orderBy: { id: "asc" } });
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await prisma.categoryDoctor.findUnique({
        where: { id: Number(id) },
      });

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }

      const newCategory = await prisma.categoryDoctor.create({ data: { category } });
      res.status(201).json({ success: true, data: newCategory });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { category } = req.body;

      const updated = await prisma.categoryDoctor.update({
        where: { id: Number(id) },
        data: { category },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await prisma.categoryDoctor.delete({ where: { id: Number(id) } });
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ success: false, message: "Category not found" });
      }
      next(error);
    }
  }
}

module.exports = new CategoryDoctorController();
