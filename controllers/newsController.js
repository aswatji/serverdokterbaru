const prisma = require('../config/database');

class NewsController {
  // Get all news
  async getAllNews(req, res, next) {
    try {
      const { search } = req.query;
      
      const where = {};
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      const news = await prisma.news.findMany({
        where,
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json({
        success: true,
        data: news
      });
    } catch (error) {
      next(error);
    }
  }

  // Get news by ID
  async getNewsById(req, res, next) {
    try {
      const { id } = req.params;
      const news = await prisma.news.findUnique({
        where: { id: id }
      });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: 'News not found'
        });
      }

      res.json({
        success: true,
        data: news
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new news
  async createNews(req, res, next) {
    try {
      const { title, content } = req.body;

      const news = await prisma.news.create({
        data: {
          title,
          content
        }
      });

      res.status(201).json({
        success: true,
        message: 'News created successfully',
        data: news
      });
    } catch (error) {
      next(error);
    }
  }

  // Update news
  async updateNews(req, res, next) {
    try {
      const { id } = req.params;
      const { title, content } = req.body;

      const updateData = {};
      if (title) updateData.title = title;
      if (content) updateData.content = content;

      const news = await prisma.news.update({
        where: { id: id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'News updated successfully',
        data: news
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete news
  async deleteNews(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.news.delete({
        where: { id: id }
      });

      res.json({
        success: true,
        message: 'News deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NewsController();