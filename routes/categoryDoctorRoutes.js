// routes/categoryDoctorRoutes.js
// ✅ Final version — Category Doctor routes

import express from "express";
const router = express.Router();
import categoryDoctorController from "../controllers/categoryDoctorController.js";

// ✅ Ambil semua kategori dokter
router.get("/", categoryDoctorController.getAll);

// ✅ Tambah kategori dokter baru
router.post("/", categoryDoctorController.create);

// ✅ Update kategori dokter
router.put("/:id", categoryDoctorController.update);

// ✅ Hapus kategori dokter
router.delete("/:id", categoryDoctorController.delete);

export default router;
