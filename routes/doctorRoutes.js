// // routes/doctorRoutes.js
// // ✅ Final version — Doctor routes (with validation and Prisma structure)

// import express from "express";
// import { body } from "express-validator";
// import doctorController from "../controllers/doctorController.js";
// import validateRequest from "../middleware/validation.js";
// import { authMiddleware, requireDoctor } from "../middleware/authMiddleware.js";

// const router = express.Router();

// /* -------------------------------------------
//    🧾 VALIDATION RULES
// ------------------------------------------- */

// // ✅ Update Doctor Profile
// const updateDoctorValidation = [
//   body("fullname")
//     .optional()
//     .notEmpty()
//     .withMessage("Full name cannot be empty"),
//   body("category")
//     .optional()
//     .isString()
//     .withMessage("Category must be a string"),
//   body("university")
//     .optional()
//     .isString()
//     .withMessage("University must be a string"),
//   body("strNumber")
//     .optional()
//     .isString()
//     .withMessage("STR Number must be a string"),
//   body("gender")
//     .optional()
//     .isIn(["MALE", "FEMALE", "male", "female"])
//     .withMessage("Gender must be either MALE or FEMALE"),
//   body("email").optional().isEmail().withMessage("Valid email is required"),
//   body("password")
//     .optional()
//     .isLength({ min: 6 })
//     .withMessage("Password must be at least 6 characters long"),
//   body("alamatRumahSakit").optional().isString(),
//   body("bio").optional().isString(),
//   body("photo").optional().isString(),
// ];

// // ✅ Doctor Schedule Validation
// const addScheduleValidation = [
//   body("dayOfWeek")
//     .isInt({ min: 0, max: 6 })
//     .withMessage("Day of week must be 0–6 (0=Sunday, 6=Saturday)"),
//   body("startTime").isISO8601().withMessage("Start time must be a valid date"),
//   body("endTime").isISO8601().withMessage("End time must be a valid date"),
// ];

// const updateScheduleValidation = [
//   body("dayOfWeek")
//     .optional()
//     .isInt({ min: 0, max: 6 })
//     .withMessage("Day of week must be 0–6 (0=Sunday, 6=Saturday)"),
//   body("startTime")
//     .optional()
//     .isISO8601()
//     .withMessage("Start time must be valid"),
//   body("endTime").optional().isISO8601().withMessage("End time must be valid"),
// ];

// /* -------------------------------------------
//    🩺 DOCTOR PROFILE ROUTES
// ------------------------------------------- */

// // ✅ Ambil semua dokter
// router.get("/", doctorController.getAllDoctors);

// // ✅ Ambil semua kategori
// router.get("/categories", doctorController.getCategories);

// // ✅ Ambil dokter berdasarkan kategori
// router.get("/category/:category", doctorController.getDoctorsByCategory);

// // ✅ Ambil dokter berdasarkan ID
// router.get("/:doctorId", doctorController.getDoctorById);

// // ✅ Update profil dokter (auth required)
// router.put(
//   "/profile",
//   authMiddleware,
//   requireDoctor,
//   updateDoctorValidation,
//   validateRequest,
//   doctorController.updateProfile
// );

// // ✅ Ambil profil dokter yang sedang login
// router.get(
//   "/profile/me",
//   authMiddleware,
//   requireDoctor,
//   doctorController.getProfile
// );
// router.put("/:id", doctorController.updatePhoto);
// /* -------------------------------------------
//    🕒 DOCTOR SCHEDULE ROUTES
// ------------------------------------------- */

// // ✅ Ambil semua jadwal dokter tertentu
// router.get("/schedules/:doctorId", doctorController.getSchedules);

// // ✅ Tambah jadwal dokter (auth + role doctor)
// router.post(
//   "/schedules",
//   authMiddleware,
//   requireDoctor,
//   addScheduleValidation,
//   validateRequest,
//   doctorController.createSchedule
// );

// // ✅ Update jadwal dokter
// router.put(
//   "/schedules/:scheduleId",
//   authMiddleware,
//   updateScheduleValidation,
//   validateRequest,
//   doctorController.updateSchedule
// );

// // ✅ Hapus jadwal dokter
// router.delete(
//   "/schedules/:scheduleId",
//   authMiddleware,
//   requireDoctor,
//   doctorController.deleteSchedule
// );

// /* -------------------------------------------
//    💬 DOCTOR CHAT ROUTES
// ------------------------------------------- */

// // ✅ Ambil semua chat dokter
// router.get(
//   "/chats",
//   authMiddleware,
//   requireDoctor,
//   doctorController.getDoctorChats
// );

// // ✅ Ambil detail chat tertentu
// router.get(
//   "/chat/:id",
//   authMiddleware,
//   requireDoctor,
//   doctorController.getDoctorChatById
// );

// export default router;

// routes/doctorRoutes.js
import express from "express";
import { body } from "express-validator";
import doctorController from "../controllers/doctorController.js";
import validateRequest from "../middleware/validation.js";
import { authMiddleware, requireDoctor } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
// ... (Validation rules tetap sama, saya skip biar ringkas) ...
const updateDoctorValidation = [
  body("fullname")
    .optional()
    .notEmpty()
    .withMessage("Full name cannot be empty"),
  body("category")
    .optional()
    .isString()
    .withMessage("Category must be a string"),
  body("university")
    .optional()
    .isString()
    .withMessage("University must be a string"),
  body("strNumber")
    .optional()
    .isString()
    .withMessage("STR Number must be a string"),
  body("gender")
    .optional()
    .isIn(["MALE", "FEMALE", "male", "female"])
    .withMessage("Gender must be either MALE or FEMALE"),
  body("email").optional().isEmail().withMessage("Valid email is required"),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("alamatRumahSakit").optional().isString(),
  body("bio").optional().isString(),
  body("photo").optional().isString(),
];
const updateScheduleValidation = [
  body("schedules").isArray().withMessage("Schedules must be an array"),
  // ...
];

/* -------------------------------------------
   🩺 DOCTOR PROFILE ROUTES (PUBLIC & AUTH)
------------------------------------------- */

router.get("/", doctorController.getAllDoctors);
router.get("/categories", doctorController.getCategories);
router.get("/category/:category", doctorController.getDoctorsByCategory);

// ✅ PENTING: Route statis (/schedule, /profile) harus DULUAN sebelum dynamic route (/:id)

// 1. Profile Me & Update Profile
router.get(
  "/profile/me",
  authMiddleware,
  requireDoctor,
  doctorController.getProfile
);
router.put(
  "/profile",
  authMiddleware,
  requireDoctor,
  updateDoctorValidation,
  validateRequest,
  doctorController.updateProfile
);

/* -------------------------------------------
   🕒 DOCTOR SCHEDULE ROUTES (PINDAHKAN KE SINI)
------------------------------------------- */
// ✅ SEKARANG DISINI (Sebelum /:id atau /:doctorId)

// ✅ UPDATE JADWAL
router.put(
  "/schedule",
  authMiddleware,
  requireDoctor,
  updateScheduleValidation,
  validateRequest,
  doctorController.updateScheduleSettings
);

// ✅ GET JADWAL
router.get(
  "/schedule",
  authMiddleware,
  requireDoctor,
  doctorController.getMySchedules
);

/* -------------------------------------------
   💬 DOCTOR CHAT ROUTES
------------------------------------------- */
router.get(
  "/chats",
  authMiddleware,
  requireDoctor,
  doctorController.getDoctorChats
);
router.get(
  "/chat/:id",
  authMiddleware,
  requireDoctor,
  doctorController.getDoctorChatById
);

/* -------------------------------------------
   ⚠️ DYNAMIC ROUTES (TARUH PALING BAWAH)
------------------------------------------- */

// ✅ Get by ID (Hati-hati, ini menangkap semua GET yang tidak match di atas)
router.get("/:doctorId", doctorController.getDoctorById);
router.put(
  "/:doctorId",
  authMiddleware,
  requireDoctor,
  doctorController.updateProfile
);
router.put("/:id", doctorController.updatePhoto);
export default router;
