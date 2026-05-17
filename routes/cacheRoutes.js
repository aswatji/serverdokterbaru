// routes/cacheRoutes.js
// ──────────────────────────────────────────────────────────────
//  🗑️  Cache Management Routes
//  Semua endpoint di sini HANYA untuk admin / internal use.
//  Lindungi dengan authMiddleware jika perlu.
// ──────────────────────────────────────────────────────────────

import express from "express";
import cacheController from "../controllers/cacheController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Semua route cache wajib login ──
router.use(authMiddleware);

// ✅ GET  /admin/cache          → Lihat semua key Redis aktif
router.get("/", cacheController.getStatus);

// ✅ DELETE /admin/cache/:group → Hapus satu grup cache
//    Contoh grup: doctors | products | product | orders | all
router.delete("/:group", cacheController.clearGroup);

// ✅ DELETE /admin/cache/key/:key → Hapus 1 key spesifik
//    Contoh: DELETE /admin/cache/key/doctors%3Adetail%3Aabc123
router.delete("/key/:key", cacheController.clearSingleKey);

export default router;
