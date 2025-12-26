// // controllers/doctorController.js
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
// import bcrypt from "bcryptjs";

// class DoctorController {
//   // ✅ Ambil semua dokter
//   async getAllDoctors(req, res) {
//     try {
//       const doctors = await prisma.doctor.findMany({
//         orderBy: { createdAt: "desc" },
//       });
//       res.json({ success: true, data: doctors });
//     } catch (error) {
//       console.error("❌ Error getAllDoctors:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ Ambil dokter berdasarkan kategori
//   async getDoctorsByCategory(req, res) {
//     try {
//       const { category } = req.params;
//       const doctors = await prisma.doctor.findMany({
//         where: { category },
//         orderBy: { fullname: "asc" },
//       });
//       res.json({ success: true, data: doctors });
//     } catch (error) {
//       console.error("❌ Error getDoctorsByCategory:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ Ambil dokter berdasarkan ID
//   async getDoctorById(req, res) {
//     try {
//       const { doctorId } = req.params;
//       const doctor = await prisma.doctor.findUnique({
//         where: { id: doctorId },
//       });
//       if (!doctor) {
//         return res
//           .status(404)
//           .json({ success: false, message: "Doctor not found" });
//       }
//       res.json({ success: true, data: doctor });
//     } catch (error) {
//       console.error("❌ Error getDoctorById:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ Update profil dokter (autentikasi dokter)
//   async updateProfile(req, res) {
//     try {
//       const doctorId = req.user.id; // dari token JWT
//       const {
//         fullname,
//         category,
//         university,
//         strNumber,
//         gender,
//         email,
//         password,
//         alamatRumahSakit,
//         bio,
//         photo,
//       } = req.body;

//       const doctor = await prisma.doctor.findUnique({
//         where: { id: doctorId },
//       });
//       if (!doctor) {
//         return res.status(404).json({
//           success: false,
//           message: "Doctor not found",
//         });
//       }

//       let updatedData = {
//         fullname,
//         category,
//         university,
//         strNumber,
//         gender,
//         email,
//         alamatRumahSakit,
//         bio,
//         photo,
//       };

//       if (password) {
//         updatedData.password = await bcrypt.hash(password, 10);
//       }

//       const updatedDoctor = await prisma.doctor.update({
//         where: { id: doctorId },
//         data: updatedData,
//       });

//       res.json({
//         success: true,
//         message: "Profile updated successfully",
//         data: updatedDoctor,
//       });
//     } catch (error) {
//       console.error("❌ Error updateProfile:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to update profile",
//         error: error.message,
//       });
//     }
//   }
//   async updatePhoto(req, res) {
//     try {
//       const doctorId = req.params.id; // ambil dari URL
//       const { photo } = req.body;

//       const updatedDoctor = await prisma.doctor.update({
//         where: { id: doctorId },
//         data: { photo },
//       });

//       res.json({
//         success: true,
//         message: "Photo berhasil diupdate",
//         data: updatedDoctor,
//       });
//     } catch (error) {
//       console.error("❌ Error updatePhoto:", error);
//       res.status(500).json({
//         success: false,
//         message: "Gagal untuk update photo",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Ambil profil dokter yang sedang login
//   async getProfile(req, res) {
//     try {
//       const doctorId = req.user.id;
//       const doctor = await prisma.doctor.findUnique({
//         where: { id: doctorId },
//         select: {
//           id: true,
//           fullname: true,
//           category: true,
//           university: true,
//           strNumber: true,
//           gender: true,
//           email: true,
//           alamatRumahSakit: true,
//           bio: true,
//           photo: true,
//         },
//       });

//       if (!doctor) {
//         return res.status(404).json({
//           success: false,
//           message: "Doctor not found",
//         });
//       }

//       res.json({ success: true, data: doctor });
//     } catch (error) {
//       console.error("❌ Error getProfile:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch profile",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Buat jadwal dokter baru
//   async createSchedule(req, res) {
//     try {
//       const doctorId = req.user.id;
//       const { dayOfWeek, startTime, endTime } = req.body;

//       const schedule = await prisma.doctorSchedule.create({
//         data: { doctorId, dayOfWeek, startTime, endTime },
//       });

//       res.status(201).json({
//         success: true,
//         message: "Schedule created successfully",
//         data: schedule,
//       });
//     } catch (error) {
//       console.error("❌ Error createSchedule:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to create schedule",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Ambil semua jadwal dokter tertentu
//   async getSchedules(req, res) {
//     try {
//       const { doctorId } = req.params;
//       const schedules = await prisma.doctorSchedule.findMany({
//         where: { doctorId },
//         orderBy: { dayOfWeek: "asc" },
//       });
//       res.json({ success: true, data: schedules });
//     } catch (error) {
//       console.error("❌ Error getSchedules:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ Update jadwal dokter
//   async updateSchedule(req, res) {
//     try {
//       const { scheduleId } = req.params;
//       const { dayOfWeek, startTime, endTime } = req.body;

//       const schedule = await prisma.doctorSchedule.findUnique({
//         where: { id: scheduleId },
//       });

//       if (!schedule) {
//         return res.status(404).json({
//           success: false,
//           message: "Schedule not found",
//         });
//       }

//       const updated = await prisma.doctorSchedule.update({
//         where: { id: scheduleId },
//         data: { dayOfWeek, startTime, endTime },
//       });

//       res.json({
//         success: true,
//         message: "Schedule updated successfully",
//         data: updated,
//       });
//     } catch (error) {
//       console.error("❌ Error updateSchedule:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to update schedule",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Hapus jadwal dokter
//   async deleteSchedule(req, res) {
//     try {
//       const { scheduleId } = req.params;

//       await prisma.doctorSchedule.delete({ where: { id: scheduleId } });

//       res.json({
//         success: true,
//         message: "Schedule deleted successfully",
//       });
//     } catch (error) {
//       console.error("❌ Error deleteSchedule:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to delete schedule",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Ambil semua chat milik dokter (opsional)
//   async getDoctorChats(req, res) {
//     try {
//       const doctorId = req.user.id;
//       const chats = await prisma.chat.findMany({
//         where: { doctorId },
//         orderBy: { createdAt: "desc" },
//         include: { user: true, lastMessage: true },
//       });

//       res.json({ success: true, data: chats });
//     } catch (error) {
//       console.error("❌ Error getDoctorChats:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch chats",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Ambil detail chat tertentu
//   async getDoctorChatById(req, res) {
//     try {
//       const { id } = req.params;
//       const doctorId = req.user.id;

//       const chat = await prisma.chat.findFirst({
//         where: { id, doctorId },
//         include: {
//           user: true,
//           messages: {
//             orderBy: { sentAt: "asc" },
//           },
//         },
//       });

//       if (!chat) {
//         return res.status(404).json({
//           success: false,
//           message: "Chat not found",
//         });
//       }

//       res.json({ success: true, data: chat });
//     } catch (error) {
//       console.error("❌ Error getDoctorChatById:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch chat detail",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Get all unique categories
//   async getCategories(req, res) {
//     try {
//       const categories = await prisma.doctor.findMany({
//         select: {
//           category: true,
//         },
//         distinct: ["category"],
//         orderBy: {
//           category: "asc",
//         },
//       });

//       const categoryList = categories.map((item) => item.category);

//       res.json({
//         success: true,
//         data: categoryList,
//       });
//     } catch (error) {
//       console.error("❌ Error getCategories:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch categories",
//         error: error.message,
//       });
//     }
//   }

//   // ✅ Get doctors by category (Firebase-like query)
//   async getDoctorsByCategory(req, res) {
//     try {
//       const { category } = req.params;

//       const doctors = await prisma.doctor.findMany({
//         where: {
//           category: {
//             equals: category,
//             mode: "insensitive",
//           },
//         },
//         select: {
//           id: true,
//           fullname: true,
//           category: true,
//           university: true,
//           strNumber: true,
//           gender: true,
//           email: true,
//           alamatRumahSakit: true,
//           bio: true,
//           photo: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//         orderBy: {
//           fullname: "asc",
//         },
//       });

//       // Add consultation count for each doctor using Chat model instead
//       const doctorsWithCount = await Promise.all(
//         doctors.map(async (doctor) => {
//           const chatCount = await prisma.chat.count({
//             where: { doctorId: doctor.id },
//           });

//           return {
//             ...doctor,
//             consultationCount: chatCount,
//           };
//         })
//       );

//       res.json({
//         success: true,
//         message: `Found ${doctorsWithCount.length} doctors in category: ${category}`,
//         data: doctorsWithCount,
//       });
//     } catch (error) {
//       console.error("❌ Error getDoctorsByCategory:", error);
//       res.status(500).json({
//         success: false,
//         message: "Failed to fetch doctors by category",
//         error: error.message,
//       });
//     }
//   }
// }

// export default new DoctorController();

// controllers/doctorController.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

class DoctorController {
  // ✅ Ambil semua dokter
  async getAllDoctors(req, res) {
    try {
      const doctors = await prisma.doctor.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: doctors });
    } catch (error) {
      console.error("❌ Error getAllDoctors:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Ambil dokter berdasarkan ID
  async getDoctorById(req, res) {
    try {
      const { doctorId } = req.params;
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!doctor) {
        return res
          .status(404)
          .json({ success: false, message: "Doctor not found" });
      }
      res.json({ success: true, data: doctor });
    } catch (error) {
      console.error("❌ Error getDoctorById:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ Update profil dokter
  async updateProfile(req, res) {
    try {
      const doctorId = req.user.id;
      const {
        fullname,
        category,
        university,
        strNumber,
        gender,
        email,
        password,
        alamatRumahSakit,
        bio,
        photo,
      } = req.body;

      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      let updatedData = {
        fullname,
        category,
        university,
        strNumber,
        gender,
        email,
        alamatRumahSakit,
        bio,
        photo,
      };

      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }

      const updatedDoctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: updatedData,
      });

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: updatedDoctor,
      });
    } catch (error) {
      console.error("❌ Error updateProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update profile",
        error: error.message,
      });
    }
  }

  async updatePhoto(req, res) {
    try {
      const doctorId = req.params.id;
      const { photo } = req.body;

      const updatedDoctor = await prisma.doctor.update({
        where: { id: doctorId },
        data: { photo },
      });

      res.json({
        success: true,
        message: "Photo berhasil diupdate",
        data: updatedDoctor,
      });
    } catch (error) {
      console.error("❌ Error updatePhoto:", error);
      res.status(500).json({
        success: false,
        message: "Gagal untuk update photo",
        error: error.message,
      });
    }
  }

  // ✅ Ambil profil dokter login
  async getProfile(req, res) {
    try {
      const doctorId = req.user.id;
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          alamatRumahSakit: true,
          bio: true,
          photo: true,
        },
      });

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: "Doctor not found",
        });
      }

      res.json({ success: true, data: doctor });
    } catch (error) {
      console.error("❌ Error getProfile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch profile",
        error: error.message,
      });
    }
  }

  // ============================================================
  // ✅ FITUR JADWAL (SCHEDULE) TERBARU
  // ============================================================

  // 1. UPDATE MASSAL JADWAL (Dipakai tombol Simpan di React Native)
  async updateScheduleSettings(req, res) {
    try {
      const doctorId = req.user.id;
      const { schedules } = req.body; // Array dari Frontend

      if (!schedules || !Array.isArray(schedules)) {
        return res.status(400).json({
          success: false,
          message: "Data jadwal tidak valid",
        });
      }

      // Gunakan Transaction agar semua data tersimpan bersamaan
      const operations = schedules.map((item) => {
        return prisma.doctorSchedule.upsert({
          where: {
            doctorId_day: {
              doctorId: doctorId,
              day: item.day,
            },
          },
          update: {
            startTime: item.start,
            endTime: item.end,
            isActive: item.active,
          },
          create: {
            doctorId: doctorId,
            day: item.day,
            startTime: item.start,
            endTime: item.end,
            isActive: item.active,
          },
        });
      });

      await prisma.$transaction(operations);

      res.json({
        success: true,
        message: "Jadwal berhasil diperbarui",
      });
    } catch (error) {
      console.error("❌ Error updateScheduleSettings:", error);
      res.status(500).json({
        success: false,
        message: "Gagal memperbarui jadwal",
        error: error.message,
      });
    }
  }

  // 2. GET JADWAL (Untuk load awal di Frontend)
  async getMySchedules(req, res) {
    try {
      const doctorId = req.user.id;
      const schedules = await prisma.doctorSchedule.findMany({
        where: { doctorId },
      });

      // Format data agar sesuai dengan frontend (Active -> active, startTime -> start)
      const formatted = schedules.map((s) => ({
        day: s.day,
        active: s.isActive,
        start: s.startTime,
        end: s.endTime,
      }));

      res.json({ success: true, data: formatted });
    } catch (error) {
      console.error("❌ Error getMySchedules:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ============================================================
  // ✅ FITUR LAINNYA
  // ============================================================

  async getDoctorChats(req, res) {
    try {
      const doctorId = req.user.id;
      const chats = await prisma.chat.findMany({
        where: { doctorId },
        orderBy: { createdAt: "desc" },
        include: { user: true, lastMessage: true },
      });

      res.json({ success: true, data: chats });
    } catch (error) {
      console.error("❌ Error getDoctorChats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chats",
        error: error.message,
      });
    }
  }

  async getDoctorChatById(req, res) {
    try {
      const { id } = req.params;
      const doctorId = req.user.id;

      const chat = await prisma.chat.findFirst({
        where: { id, doctorId },
        include: {
          user: true,
          messages: {
            orderBy: { sentAt: "asc" },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({
          success: false,
          message: "Chat not found",
        });
      }

      res.json({ success: true, data: chat });
    } catch (error) {
      console.error("❌ Error getDoctorChatById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chat detail",
        error: error.message,
      });
    }
  }

  async getCategories(req, res) {
    try {
      const categories = await prisma.doctor.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });

      const categoryList = categories.map((item) => item.category);

      res.json({ success: true, data: categoryList });
    } catch (error) {
      console.error("❌ Error getCategories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
        error: error.message,
      });
    }
  }

  async getDoctorsByCategory(req, res) {
    try {
      const { category } = req.params;

      const doctors = await prisma.doctor.findMany({
        where: {
          category: {
            equals: category,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          fullname: true,
          category: true,
          university: true,
          strNumber: true,
          gender: true,
          email: true,
          alamatRumahSakit: true,
          bio: true,
          photo: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { fullname: "asc" },
      });

      const doctorsWithCount = await Promise.all(
        doctors.map(async (doctor) => {
          const chatCount = await prisma.chat.count({
            where: { doctorId: doctor.id },
          });
          return { ...doctor, consultationCount: chatCount };
        })
      );

      res.json({
        success: true,
        message: `Found ${doctorsWithCount.length} doctors`,
        data: doctorsWithCount,
      });
    } catch (error) {
      console.error("❌ Error getDoctorsByCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch doctors by category",
        error: error.message,
      });
    }
  }
}

export default new DoctorController();
