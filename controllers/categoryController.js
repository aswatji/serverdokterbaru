const prisma = require("../config/database");

class CategoryController {
  // Get all categories
  async getAllCategories(req, res, next) {
    try {
      const categories = await prisma.category.findMany({
        orderBy: {
          name: "asc",
        },
      });

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get category by ID
  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await prisma.category.findUnique({
        where: { id: id },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new category
  async createCategory(req, res, next) {
    try {
      const { name, items } = req.body;

      const category = await prisma.category.create({
        data: {
          name,
          items: items || null,
        },
      });

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update category
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { name, items } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (items !== undefined) updateData.items = items;

      const category = await prisma.category.update({
        where: { id: id },
        data: updateData,
      });

      res.json({
        success: true,
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete category
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.category.delete({
        where: { id: id },
      });

      res.json({
        success: true,
        message: "Category deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
