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

      // const token = jwt.sign({ id: doctor.id, type: "doctor" }, JWT_SECRET, {
      //   expiresIn: "1d",
      // });

      // // Remove password from response
      // const { password: _, ...doctorWithoutPassword } = doctor;

      res.status(201).json({
        success: true,
        message: "Doctor registered successfully",
        data: {
          token,
          doctor,
        },
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

  // ✅ Login khusus untuk user/pasien
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ id: user.id, type: "user" }, JWT_SECRET, {
        expiresIn: "1d",
      });

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: "User login successful",
        data: {
          token,
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error("❌ Error loginUser:", error);
      res.status(500).json({
        success: false,
        message: "Failed to login user",
        error: error.message,
      });
    }
  }

  // ✅ Login khusus untuk doctor
  async loginDoctor(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const doctor = await prisma.doctor.findUnique({ where: { email } });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const isMatch = await bcrypt.compare(password, doctor.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const token = jwt.sign({ id: doctor.id, type: "doctor" }, JWT_SECRET, {
        expiresIn: "1d",
      });

      // Remove password from response
      const { password: _, ...doctorWithoutPassword } = doctor;

      res.json({
        success: true,
        message: "Doctor login successful",
        data: {
          token,
          doctor: doctorWithoutPassword,
        },
      });
    } catch (error) {
      console.error("❌ Error loginDoctor:", error);
      res.status(500).json({
        success: false,
        message: "Failed to login doctor",
        error: error.message,
      });
    }
  }

  // ✅ Login gabungan (backward compatibility)
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

  // ✅ Get profile khusus untuk user/pasien
  async getUserProfile(req, res) {
    try {
      const { id, type } = req.user;

      // Pastikan yang akses adalah user
      if (type !== "user") {
        return res.status(403).json({
          success: false,
          message: "Access denied. User endpoint only.",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullname: true,
          email: true,
          photo: true,
          profession: true,
          createdAt: true,
          updatedAt: true,
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
        message: "User profile retrieved successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Error getUserProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch user profile",
        error: error.message,
      });
    }
  }

  // ✅ Get profile khusus untuk doctor
  async getDoctorProfile(req, res) {
    try {
      const { id, type } = req.user;

      // Pastikan yang akses adalah doctor
      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Doctor endpoint only.",
        });
      }

      const doctor = await prisma.doctor.findUnique({
        where: { id },
        select: {
          id: true,
          fullname: true,
          email: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          photo: true,
          bio: true,
          alamatRumahSakit: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      res.json({
        success: true,
        message: "Doctor profile retrieved successfully",
        data: doctor,
      });
    } catch (error) {
      console.error("❌ Error getDoctorProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch doctor profile",
        error: error.message,
      });
    }
  }

  // ✅ Signout khusus untuk user/pasien
  async signoutUser(req, res) {
    try {
      const { id, type } = req.user;

      // Pastikan yang logout adalah user
      if (type !== "user") {
        return res.status(403).json({
          success: false,
          message: "Access denied. User endpoint only.",
        });
      }

      console.log(`User ${id} signed out at ${new Date()}`);

      res.json({
        success: true,
        message: "User signed out successfully",
        data: {
          signedOutAt: new Date(),
          message: "Please remove token from client storage",
          userType: "user",
        },
      });
    } catch (error) {
      console.error("❌ Error signoutUser:", error);
      res.status(500).json({
        success: false,
        message: "Failed to signout user",
        error: error.message,
      });
    }
  }

  // ✅ Signout khusus untuk doctor
  async signoutDoctor(req, res) {
    try {
      const { id, type } = req.user;

      // Pastikan yang logout adalah doctor
      if (type !== "doctor") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Doctor endpoint only.",
        });
      }

      console.log(`Doctor ${id} signed out at ${new Date()}`);

      res.json({
        success: true,
        message: "Doctor signed out successfully",
        data: {
          signedOutAt: new Date(),
          message: "Please remove token from client storage",
          userType: "doctor",
        },
      });
    } catch (error) {
      console.error("❌ Error signoutDoctor:", error);
      res.status(500).json({
        success: false,
        message: "Failed to signout doctor",
        error: error.message,
      });
    }
  }

  // ✅ Signout gabungan (backward compatibility)
  async signout(req, res) {
    try {
      // Untuk JWT-based auth, signout dilakukan dengan menghapus token di client
      // Di sini kita bisa log aktivitas signout
      const { id, type } = req.user;

      console.log(`${type} ${id} signed out at ${new Date()}`);

      res.json({
        success: true,
        message: `${type} signed out successfully`,
        data: {
          signedOutAt: new Date(),
          message: "Please remove token from client storage",
        },
      });
    } catch (error) {
      console.error("❌ Error signout:", error);
      res.status(500).json({
        success: false,
        message: "Failed to signout",
        error: error.message,
      });
    }
  }
}

module.exports = new AuthController();
