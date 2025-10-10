// controllers/authController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

class AuthController {
  // ✅ Register user
  async registerUser(req, res) {
    try {
      const { email, password, fullname, profession } = req.body;

      if (!email || !password || !fullname) {
        return res.status(400).json({
          success: false,
          message: "email, password, and fullname are required",
        });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, fullname, profession },
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Error registerUser:", error);
      res.status(500).json({
        success: false,
        message: "Failed to register user",
        error: error.message,
      });
    }
  }

  // ✅ Register doctor
  async registerDoctor(req, res) {
    try {
      const {
        fullname,
        category,
        university,
        strNumber,
        gender,
        email,
        password,
        bio,
        photo,
        alamatRumahSakit,
      } = req.body;

      if (!fullname || !email || !password || !category || !strNumber) {
        return res.status(400).json({
          success: false,
          message:
            "fullname, email, password, category, and strNumber are required",
        });
      }

      const existing = await prisma.doctor.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const doctor = await prisma.doctor.create({
        data: {
          fullname,
          category,
          university,
          strNumber,
          gender,
          email,
          password: hashedPassword,
          bio,
          photo,
          alamatRumahSakit,
        },
      });

      res.status(201).json({
        success: true,
        message: "Doctor registered successfully",
        data: doctor,
      });
    } catch (error) {
      console.error("❌ Error registerDoctor:", error);
      res.status(500).json({
        success: false,
        message: "Failed to register doctor",
        error: error.message,
      });
    }
  }

  // ✅ Login untuk user & doctor
  async login(req, res) {
    try {
      const { email, password, role } = req.body;

      if (!email || !password || !role) {
        return res.status(400).json({
          success: false,
          message:
            "email, password, and role are required ('user' or 'doctor')",
        });
      }

      let account;
      if (role === "user") {
        account = await prisma.user.findUnique({ where: { email } });
      } else if (role === "doctor") {
        account = await prisma.doctor.findUnique({ where: { email } });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be 'user' or 'doctor'",
        });
      }

      if (!account) {
        return res.status(404).json({
          success: false,
          message: `${role} not found`,
        });
      }

      const isMatch = await bcrypt.compare(password, account.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ id: account.id, type: role }, JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        success: true,
        message: `${role} login successful`,
        data: { token, account },
      });
    } catch (error) {
      console.error("❌ Error login:", error);
      res.status(500).json({
        success: false,
        message: "Failed to login",
        error: error.message,
      });
    }
  }
  async doctorRegister(req, res) {
    try {
      // logic register dokter
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async doctorLogin(req, res) {
    try {
      // logic login dokter
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Get profile (otomatis berdasarkan token)
  async getProfile(req, res) {
    try {
      const { id, type } = req.user;

      if (type === "user") {
        const user = await prisma.user.findUnique({
          where: { id },
          select: {
            id: true,
            fullname: true,
            email: true,
            photo: true,
            profession: true,
            createdAt: true,
          },
        });

        return res.json({ success: true, type, data: user });
      }

      if (type === "doctor") {
        const doctor = await prisma.doctor.findUnique({
          where: { id },
          select: {
            id: true,
            fullname: true,
            email: true,
            category: true,
            university: true,
            strNumber: true,
            photo: true,
            createdAt: true,
          },
        });

        return res.json({ success: true, type, data: doctor });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    } catch (error) {
      console.error("❌ Error getProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
