const bcrypt = require("bcryptjs");
const prisma = require("../config/database");

class DoctorController {
  // Get all doctors
  async getAllDoctors(req, res, next) {
    try {
      const doctors = await prisma.doctor.findMany({
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          bio: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
          schedules: true,
          _count: {
            select: {
              consultations: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get doctor by ID
  async getDoctorById(req, res, next) {
    try {
      const { id } = req.params;
      const doctor = await prisma.doctor.findUnique({
        where: { id: id },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          bio: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
          schedules: {
            orderBy: {
              dayOfWeek: "asc",
            },
          },
          consultations: {
            include: {
              patient: {
                select: {
                  id: true,
                  fullname: true,
                  email: true,
                },
              },
              payment: true,
            },
            orderBy: {
              startedAt: "desc",
            },
            take: 10,
          },
          _count: {
            select: {
              consultations: true,
              messages: true,
            },
          },
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
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new doctor
  async createDoctor(req, res, next) {
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
      } = req.body;

      if (
        !fullname ||
        !category ||
        !university ||
        !strNumber ||
        !gender ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "fullname, category, university, strNumber, gender, email, and password are required",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const doctor = await prisma.doctor.create({
        data: {
          fullname,
          category,
          university,
          strNumber,
          gender,
          email,
          password: hashedPassword,
          bio: bio || null,
          photo: photo || null,
        },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          bio: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { consultations: true },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Doctor created successfully",
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update doctor
  async updateDoctor(req, res, next) {
    try {
      const { id } = req.params;
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
      } = req.body;

      const updateData = {};
      if (fullname) updateData.fullname = fullname;
      if (category) updateData.category = category;
      if (university) updateData.university = university;
      if (strNumber) updateData.strNumber = strNumber;
      if (gender) updateData.gender = gender;
      if (email) updateData.email = email;
      if (password) updateData.password = await bcrypt.hash(password, 12);
      if (bio !== undefined) updateData.bio = bio;
      if (photo !== undefined) updateData.photo = photo;

      const doctor = await prisma.doctor.update({
        where: { id: id },
        data: updateData,
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          bio: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
          schedules: true,
          _count: {
            select: { consultations: true },
          },
        },
      });

      res.json({
        success: true,
        message: "Doctor updated successfully",
        data: doctor,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete doctor
  async deleteDoctor(req, res, next) {
    try {
      const { id } = req.params;

      await prisma.doctor.delete({
        where: { id: id },
      });

      res.json({
        success: true,
        message: "Doctor deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // Add doctor schedule
  async addSchedule(req, res, next) {
    try {
      const { doctorId, dayOfWeek, startTime, endTime } = req.body;

      // Check if doctor exists
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          fullname: true,
          category: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const schedule = await prisma.doctorSchedule.create({
        data: {
          doctorId,
          dayOfWeek,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        },
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Schedule added successfully",
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get schedules for a doctor
  async getSchedules(req, res, next) {
    try {
      const { doctorId } = req.params;

      // Check if doctor exists
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          fullname: true,
          category: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      const schedules = await prisma.doctorSchedule.findMany({
        where: { doctorId },
        orderBy: { dayOfWeek: "asc" },
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: {
          doctor: {
            id: doctor.id,
            fullname: doctor.fullname,
            category: doctor.category,
          },
          schedules: schedules,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Update doctor schedule
  async updateSchedule(req, res, next) {
    try {
      const { scheduleId } = req.params;
      const { dayOfWeek, startTime, endTime } = req.body;

      const updateData = {};
      if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;
      if (startTime) updateData.startTime = new Date(startTime);
      if (endTime) updateData.endTime = new Date(endTime);

      const schedule = await prisma.doctorSchedule.update({
        where: { id: scheduleId },
        data: updateData,
        include: {
          doctor: {
            select: {
              id: true,
              fullname: true,
              category: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Schedule updated successfully",
        data: schedule,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete doctor schedule
  async deleteSchedule(req, res, next) {
    try {
      const { scheduleId } = req.params;

      await prisma.doctorSchedule.delete({
        where: { id: scheduleId },
      });

      res.json({
        success: true,
        message: "Schedule deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DoctorController();
