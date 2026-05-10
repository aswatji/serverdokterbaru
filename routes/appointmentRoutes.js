import express from "express";
import appointmentController from "../controllers/appointmentController.js";

const router = express.Router();

// ✅ GET /api/appointments/available-slots?doctorId=ID_DOKTER&date=2026-05-15
// (Dipanggil saat pasien pilih tanggal di kalender)
router.get("/available-slots", appointmentController.getAvailableSlots);

// ✅ GET /api/appointments/user?userId=ID_USER
// (Dipanggil saat pasien buka menu "Jadwal Saya")
router.get("/user", appointmentController.getUserAppointments);

// ✅ POST /api/appointments
// (Dipanggil saat pasien klik tombol "Konfirmasi Janji Temu")
router.post("/", appointmentController.createAppointment);

export default router;