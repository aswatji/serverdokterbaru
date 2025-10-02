// authController.js
// Implement user registration and login with Prisma, bcrypt, and JWT.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/database");

class AuthController {
  // 1. register(req, res) - User registration
  async register(req, res, next) {
    try {
      const { email, password, fullname, profession } = req.body;

      // Validate required fields
      if (!email || !password || !fullname || !profession) {
        return res.status(400).json({
          success: false,
          message: "Email, password, profession, and fullname are required",
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      // Hash password with bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user in Prisma
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullname,
          profession,
        },
        select: {
          id: true,
          email: true,
          fullname: true,
          photo: true,
          profession: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Return created user without password
      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: user,
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  }

  // 2. login(req, res) - User login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          fullname: true,
          photo: true,
          profession: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Compare password with bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // If valid, issue JWT (id, email) with 1h expiry
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          type: "user",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "1h" }
      );

      // Return { token, user } without password
      const userResponse = {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        photo: user.photo,
        profession: user.profession,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json({
        success: true,
        message: "Login successful",
        data: {
          token,
          user: userResponse,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  }

  // Additional method for doctor login (if needed)
  async doctorLogin(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // For now, we'll use a simple check - in production, doctors should have separate auth
      // This is a placeholder implementation
      const doctor = await prisma.doctor.findFirst({
        where: {
          // Assuming doctors might have email field in future or use name as identifier
          name: email, // Temporary implementation
        },
      });

      if (!doctor) {
        return res.status(401).json({
          success: false,
          message: "Doctor not found",
        });
      }

      // For demo purposes, allow any password for doctors
      // In production, doctors should have proper password authentication
      const token = jwt.sign(
        {
          id: doctor.id,
          email: doctor.name, // Using name as email for now
          type: "doctor",
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "1h" }
      );

      res.json({
        success: true,
        message: "Doctor login successful",
        data: {
          token,
          doctor: {
            id: doctor.id,
            name: doctor.name,
            specialty: doctor.specialty,
            bio: doctor.bio,
            photo: doctor.photo,
          },
        },
      });
    } catch (error) {
      console.error("Doctor login error:", error);
      next(error);
    }
  }
}

module.exports = new AuthController();
