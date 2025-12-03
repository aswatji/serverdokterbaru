// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

// class AuthController {
//   // ======================================================
//   // 👤 USER (Pasien)
//   // ======================================================

//   // ✅ Register User
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

//   // ✅ Login User
//   async loginUser(req, res) {
//     try {
//       const { email, password } = req.body;

//       if (!email || !password) {
//         return res.status(400).json({
//           success: false,
//           message: "email and password are required",
//         });
//       }

//       const user = await prisma.user.findUnique({ where: { email } });
//       if (!user) {
//         return res
//           .status(404)
//           .json({ success: false, message: "User not found" });
//       }

//       const isMatch = await bcrypt.compare(password, user.password);
//       if (!isMatch) {
//         return res
//           .status(401)
//           .json({ success: false, message: "Invalid credentials" });
//       }

//       const token = jwt.sign(
//         { id: user.id, email: user.email, type: "user" },
//         JWT_SECRET,
//         { expiresIn: "1d" }
//       );

//       res.status(200).json({
//         success: true,
//         message: "User login successful",
//         data: { token, user },
//       });
//     } catch (error) {
//       console.error("❌ Error loginUser:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to login user",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Logout User (hapus token di sisi client)
//   async logoutUser(req, res) {
//     try {
//       res.status(200).json({
//         success: true,
//         message:
//           "User logged out successfully. Please remove token on client side.",
//       });
//     } catch (error) {
//       console.error("❌ Error logoutUser:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to logout user",
//         error: error.message,
//       });
//     }
//   }

//   // ======================================================
//   // 👨‍⚕️ DOCTOR
//   // ======================================================

//   // ✅ Register Doctor
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

//   // ✅ Login Doctor
//   async loginDoctor(req, res) {
//     try {
//       const { email, password } = req.body;

//       if (!email || !password) {
//         return res.status(400).json({
//           success: false,
//           message: "email and password are required",
//         });
//       }

//       const doctor = await prisma.doctor.findUnique({ where: { email } });
//       if (!doctor) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Doctor not found" });
//       }

//       const isMatch = await bcrypt.compare(password, doctor.password);
//       if (!isMatch) {
//         return res
//           .status(401)
//           .json({ success: false, message: "Invalid credentials" });
//       }

//       const token = jwt.sign(
//         { id: doctor.id, email: doctor.email, type: "doctor" },
//         JWT_SECRET,
//         { expiresIn: "1d" }
//       );

//       res.status(200).json({
//         success: true,
//         message: "Doctor login successful",
//         data: { token, doctor },
//       });
//     } catch (error) {
//       console.error("❌ Error loginDoctor:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to login doctor",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Logout Doctor (hapus token di sisi client)
//   async logoutDoctor(req, res) {
//     try {
//       res.status(200).json({
//         success: true,
//         message:
//           "Doctor logged out successfully. Please remove token on client side.",
//       });
//     } catch (error) {
//       console.error("❌ Error logoutDoctor:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to logout doctor",
//         error: error.message,
//       });
//     }
//   }

//   // ======================================================
//   // 🔍 GET PROFILE (untuk kedua jenis akun)
//   // ======================================================
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

//       res.status(400).json({ success: false, message: "Invalid account type" });
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

// export default new AuthController();

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
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

  // ✅ Logout User (🔥 UPDATE: Hapus Token DB)
  async logoutUser(req, res) {
    try {
      // Pastikan route logout menggunakan middleware 'verifyToken' agar req.user tersedia
      if (req.user && req.user.id) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: { pushToken: null }, // Hapus token supaya tidak dapat notif lagi
        });
        console.log(`🚪 User ${req.user.id} logged out. Token cleared.`);
      }

      res.status(200).json({
        success: true,
        message: "User logged out successfully. Token cleared.",
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
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }

      const isMatch = await bcrypt.compare(password, doctor.password);
      if (!isMatch) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid credentials" });
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

  // ✅ Logout Doctor (🔥 UPDATE: Hapus Token DB)
  async logoutDoctor(req, res) {
    try {
      // Pastikan route logout menggunakan middleware 'verifyToken'
      if (req.user && req.user.id) {
        await prisma.doctor.update({
          where: { id: req.user.id },
          data: { pushToken: null }, // Hapus token
        });
        console.log(`🚪 Doctor ${req.user.id} logged out. Token cleared.`);
      }

      res.status(200).json({
        success: true,
        message: "Doctor logged out successfully. Token cleared.",
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
  // 🔍 GET PROFILE
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
            pushToken: true, // Opsional: kalau mau cek tokennya
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
            pushToken: true, // Opsional
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

  // ======================================================
  // 🔔 NOTIFICATION TOKEN (🔥 BARU)
  // ======================================================
  async updatePushToken(req, res) {
    try {
      // req.user didapat dari middleware 'verifyToken'
      const { id, type } = req.user;
      const { pushToken } = req.body;

      console.log(`🔔 Updating Token for ${type} ${id}: ${pushToken}`);

      if (!pushToken) {
        return res.status(400).json({
          success: false,
          message: "pushToken is required",
        });
      }

      if (type === "doctor") {
        await prisma.doctor.update({
          where: { id: id },
          data: { pushToken: pushToken },
        });
      } else if (type === "user") {
        await prisma.user.update({
          where: { id: id },
          data: { pushToken: pushToken },
        });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user type" });
      }

      res.status(200).json({
        success: true,
        message: "Push token updated successfully",
      });
    } catch (error) {
      console.error("❌ Error updatePushToken:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update token",
        error: error.message,
      });
    }
  }
}

export default new AuthController();