// controllers/userController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcryptjs";

class UserController {
  // ✅ Ambil semua user
  async getAll(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          fullname: true,
          email: true,
          profession: true,
          photo: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ success: true, data: users });
    } catch (error) {
      console.error("❌ Error getAll:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Ambil user berdasarkan ID
  async getById(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullname: true,
          email: true,
          profession: true,
          photo: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error("❌ Error getById:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Tambah user baru
  async create(req, res) {
    try {
      const { fullname, email, password, profession, photo } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: { fullname, email, password: hashedPassword, profession, photo },
      });

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser,
      });
    } catch (error) {
      console.error("❌ Error create:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Update user
  async update(req, res) {
    try {
      const { id } = req.params;
      const { fullname, email, profession, photo, password } = req.body;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const updatedData = {
        fullname,
        email,
        profession,
        photo,
      };

      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updatedData,
      });

      res.json({
        success: true,
        message: "User updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("❌ Error update:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Hapus user
  async delete(req, res) {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      await prisma.user.delete({ where: { id } });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("❌ Error delete:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new UserController();
