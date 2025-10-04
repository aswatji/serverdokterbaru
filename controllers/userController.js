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
          fullname: true,
          email: true,
          photo: true,
          profession: true,
          createdAt: true,
          _count: {
            select: {
              messages: true,
              consultations: true,
            },
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
        where: { id: id },
        include: {
          consultations: {
            include: {
              doctor: {
                select: {
                  id: true,
                  fullname: true,
                  category: true,
                },
              },
              payment: true,
              chat: {
                include: {
                  messages: {
                    orderBy: {
                      sentAt: "desc",
                    },
                    take: 5, // Get last 5 messages
                  },
                },
              },
            },
            orderBy: {
              startedAt: "desc",
            },
          },
          messages: {
            include: {
              chat: {
                include: {
                  consultation: {
                    select: {
                      id: true,
                      doctor: {
                        select: {
                          fullname: true,
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: {
              sentAt: "desc",
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

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new user
  async createUser(req, res, next) {
    try {
      const { fullname, email, password, profession, photo } = req.body;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          fullname,
          email,
          password: hashedPassword,
          profession: profession || null,
          photo: photo || null,
        },
        select: {
          id: true,
          fullname: true,
          email: true,
          profession: true,
          photo: true,
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
      const { fullname, email, profession, photo } = req.body;

      const updateData = {};
      if (fullname) updateData.fullname = fullname;
      if (email) updateData.email = email;
      if (profession !== undefined) updateData.profession = profession;
      if (photo !== undefined) updateData.photo = photo;

      const user = await prisma.user.update({
        where: { id: id },
        data: updateData,
        select: {
          id: true,
          fullname: true,
          email: true,
          profession: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
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
        where: { id: id },
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
