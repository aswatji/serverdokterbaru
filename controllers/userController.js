const prisma = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class UserController {
  // Get all users
  async getAllUsers(req, res, next) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: {
            select: { messages: true },
          },
        },
      });

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          messages: {
            include: {
              chat: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new user
  async createUser(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Hash password if provided
      let hashedPassword;
      if (password) {
        hashedPassword = await bcrypt.hash(password, 12);
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          ...(hashedPassword && { password: hashedPassword }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update user
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: { name, email },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      res.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete user
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.user.delete({
        where: { id: parseInt(id) },
      });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
