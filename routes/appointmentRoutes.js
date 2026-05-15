import express from "express";
import AppointmentController from "../controllers/appointmentController.js"; // Sesuaikan path foldernya
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", AppointmentController.createAppointment);

router.get("/slots", AppointmentController.getAvailableSlots);

router.get("/user", AppointmentController.getUserAppointments);

router.patch("/:id/status", AppointmentController.updateAppointmentStatus);

router.post("/start-chat", AppointmentController.startChatSession);
export default router;
