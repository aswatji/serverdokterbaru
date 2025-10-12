// // controllers/authController.js
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// class AuthController {
//   // ✅ Register user
//   async registerUser(req, res) {
//     try {
//       const { email, password, fullname, profession } = req.body;

//       if (!email || !password || !fullname) {
//         return res.status(400).json({
//           success: false,
//           message: "email, password, and fullname are required",
//         });
//       }

//       const existing = await prisma.user.findUnique({ where: { email } });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already registered",
//         });
//       }

//       const hashedPassword = await bcrypt.hash(password, 10);
//       const user = await prisma.user.create({
//         data: { email, password: hashedPassword, fullname, profession },
//       });

//       res.status(201).json({
//         success: true,
//         message: "User registered successfully",
//         data: user,
//       });
//     } catch (error) {
//       console.error("❌ Error registerUser:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to register user",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Register doctor
//   async registerDoctor(req, res) {
//     try {
//       const {
//         fullname,
//         category,
//         university,
//         strNumber,
//         gender,
//         email,
//         password,
//         bio,
//         photo,
//         alamatRumahSakit,
//       } = req.body;

//       if (!fullname || !email || !password || !category || !strNumber) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "fullname, email, password, category, and strNumber are required",
//         });
//       }

//       const existing = await prisma.doctor.findUnique({ where: { email } });
//       if (existing) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already registered",
//         });
//       }

//       const hashedPassword = await bcrypt.hash(password, 10);
//       const doctor = await prisma.doctor.create({
//         data: {
//           fullname,
//           category,
//           university,
//           strNumber,
//           gender,
//           email,
//           password: hashedPassword,
//           bio,
//           photo,
//           alamatRumahSakit,
//         },
//       });

//       res.status(201).json({
//         success: true,
//         message: "Doctor registered successfully",
//         data: doctor,
//       });
//     } catch (error) {
//       console.error("❌ Error registerDoctor:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to register doctor",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Login untuk user & doctor
//   async login(req, res) {
//     try {
//       const { email, password, role } = req.body;

//       if (!email || !password || !role) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "email, password, and role are required ('user' or 'doctor')",
//         });
//       }

//       let account;
//       if (role === "user") {
//         account = await prisma.user.findUnique({ where: { email } });
//       } else if (role === "doctor") {
//         account = await prisma.doctor.findUnique({ where: { email } });
//       } else {
//         return res.status(400).json({
//           success: false,
//           message: "Invalid role. Must be 'user' or 'doctor'",
//         });
//       }

//       if (!account) {
//         return res.status(404).json({
//           success: false,
//           message: `${role} not found`,
//         });
//       }

//       const isMatch = await bcrypt.compare(password, account.password);
//       if (!isMatch) {
//         return res.status(401).json({
//           success: false,
//           message: "Invalid credentials",
//         });
//       }

//       const token = jwt.sign({ id: account.id, type: role }, JWT_SECRET, {
//         expiresIn: "1d",
//       });

//       res.json({
//         success: true,
//         message: `${role} login successful`,
//         data: { token, account },
//       });
//     } catch (error) {
//       console.error("❌ Error login:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to login",
//         error: error.message,
//       });
//     }
//   }
//   async doctorRegister(req, res) {
//     try {
//       // logic register dokter
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   async doctorLogin(req, res) {
//     try {
//       // logic login dokter
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ Get profile (otomatis berdasarkan token)
//   async getProfile(req, res) {
//     try {
//       const { id, type } = req.user;

//       if (type === "user") {
//         const user = await prisma.user.findUnique({
//           where: { id },
//           select: {
//             id: true,
//             fullname: true,
//             email: true,
//             photo: true,
//             profession: true,
//             createdAt: true,
//           },
//         });

//         return res.json({ success: true, type, data: user });
//       }

//       if (type === "doctor") {
//         const doctor = await prisma.doctor.findUnique({
//           where: { id },
//           select: {
//             id: true,
//             fullname: true,
//             email: true,
//             category: true,
//             university: true,
//             strNumber: true,
//             photo: true,
//             createdAt: true,
//           },
//         });

//         return res.json({ success: true, type, data: doctor });
//       }

//       return res.status(400).json({
//         success: false,
//         message: "Invalid account type",
//       });
//     } catch (error) {
//       console.error("❌ Error getProfile:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch profile",
//         error: error.message,
//       });
//     }
//   }
// }

// module.exports = new AuthController();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

class AuthController {
  // ======================================================
  // 👤 USER (Pasien)
  // ======================================================

  // ✅ Register User
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

  // ✅ Login User
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "email and password are required",
        });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, type: "user" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        success: true,
        message: "User login successful",
        data: { token, user },
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

  // ✅ Logout User (hapus token di sisi client)
  async logoutUser(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: "User logged out successfully. Please remove token on client side.",
      });
    } catch (error) {
      console.error("❌ Error logoutUser:", error);
      res.status(500).json({
        success: false,
        message: "Failed to logout user",
        error: error.message,
      });
    }
  }

  // ======================================================
  // 👨‍⚕️ DOCTOR
  // ======================================================

  // ✅ Register Doctor
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

  // ✅ Login Doctor
  async loginDoctor(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "email and password are required",
        });
      }

      const doctor = await prisma.doctor.findUnique({ where: { email } });
      if (!doctor) {
        return res.status(404).json({ success: false, message: "Doctor not found" });
      }

      const isMatch = await bcrypt.compare(password, doctor.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: doctor.id, email: doctor.email, type: "doctor" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.status(200).json({
        success: true,
        message: "Doctor login successful",
        data: { token, doctor },
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

  // ✅ Logout Doctor (hapus token di sisi client)
  async logoutDoctor(req, res) {
    try {
      res.status(200).json({
        success: true,
        message: "Doctor logged out successfully. Please remove token on client side.",
      });
    } catch (error) {
      console.error("❌ Error logoutDoctor:", error);
      res.status(500).json({
        success: false,
        message: "Failed to logout doctor",
        error: error.message,
      });
    }
  }

  // ======================================================
  // 🔍 GET PROFILE (untuk kedua jenis akun)
  // ======================================================
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

      res.status(400).json({ success: false, message: "Invalid account type" });
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
