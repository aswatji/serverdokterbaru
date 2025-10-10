// routes/categoryDoctorRoutes.js
// ✅ Final version — Category Doctor routes

const express = require("express");
const router = express.Router();
const categoryDoctorController = require("../controllers/categoryDoctorController");

// ✅ Ambil semua kategori dokter
router.get("/", categoryDoctorController.getAll);

// ✅ Tambah kategori dokter baru
router.post("/", categoryDoctorController.create);

// ✅ Update kategori dokter
router.put("/:id", categoryDoctorController.update);

// ✅ Hapus kategori dokter
router.delete("/:id", categoryDoctorController.delete);

module.exports = router;
