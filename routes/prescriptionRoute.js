// routes/prescriptionRoutes.js
import express from "express";
import upload from "../middleware/uploadMiddleware.js"; // Pastikan path middleware ini benar
import { createPrescription } from "../controllers/prescriptionController.js";

export default function prescriptionRoutes(io) {
  const router = express.Router();

  router.post("/upload", upload.single("file"), (req, res) => {
    createPrescription(req, res, io);
  });

  return router;
}
