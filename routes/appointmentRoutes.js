import express from "express";
import AppointmentController from "../controllers/appointmentController.js"; // Sesuaikan path foldernya

const router = express.Router();

router.post("/", AppointmentController.createAppointment);

router.get("/slots", AppointmentController.getAvailableSlots);

router.get("/user", AppointmentController.getUserAppointments);

export default router;
