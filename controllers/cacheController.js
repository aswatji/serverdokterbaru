// controllers/cacheController.js
// ──────────────────────────────────────────────────────────────
//  🗑️  Admin Cache Manager
//  Endpoint khusus untuk menghapus cache Redis secara manual
//  tanpa harus restart server.
//
//  Semua route di sini WAJIB dilindungi middleware auth admin.
// ──────────────────────────────────────────────────────────────

import redis from "../utils/redisClient.js";

// ──────────────────────────────────────────────
//  🗂️  Peta grup cache → pattern key Redis
// ──────────────────────────────────────────────
const CACHE_GROUPS = {
  doctors:            "doctors:*",              // Semua cache dokter
  products:           "products:*",             // Cache list & home produk
  product:            "product:*",              // Cache detail produk
  orders:             "admin:orders:*",         // Cache order admin
  categories:         "categories:all",         // Cache kategori berita/chat
  product_categories: "product_categories:all", // Cache kategori produk
  category_doctor:    "category_doctor:all",    // Cache kategori dokter
  news:               "news:*",                 // Cache berita
  pharmacy:           "pharmacy:*",             // Cache order user apotek
  ratings:            "doctor_ratings:*",       // Cache rating dokter
  all:                "*",                      // 🔥 FLUSH SEMUA
};

// ──────────────────────────────────────────────
//  🛠️  Helper: hapus semua key yang cocok pattern
// ──────────────────────────────────────────────
const deleteByPattern = async (pattern) => {
  const keys = await redis.keys(pattern);
  if (!keys || keys.length === 0) return 0;
  await redis.del(keys);
  return keys.length;
};

// ──────────────────────────────────────────────────────────────
class CacheController {

  // ✅ GET /admin/cache
  // Lihat semua key Redis yang aktif beserta grupnya
  async getStatus(req, res) {
    try {
      const summary = {};

      for (const [group, pattern] of Object.entries(CACHE_GROUPS)) {
        if (group === "all") continue; // skip "all" dari summary
        const keys = await redis.keys(pattern);
        summary[group] = {
          pattern,
          count: keys?.length ?? 0,
          keys: keys ?? [],
        };
      }

      const totalKeys = Object.values(summary).reduce(
        (acc, g) => acc + g.count,
        0
      );

      res.json({
        success: true,
        message: `Redis aktif dengan ${totalKeys} key tersimpan`,
        isRedisReady: redis.isReady(),
        total: totalKeys,
        groups: summary,
      });
    } catch (error) {
      console.error("❌ Cache Status Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ DELETE /admin/cache/:group
  // Hapus satu grup cache berdasarkan nama grup
  // Contoh: DELETE /admin/cache/doctors  → hapus semua cache dokter
  //         DELETE /admin/cache/products → hapus semua cache produk
  //         DELETE /admin/cache/all      → 🔥 flush semua
  async clearGroup(req, res) {
    try {
      const { group } = req.params;

      const pattern = CACHE_GROUPS[group];
      if (!pattern) {
        return res.status(400).json({
          success: false,
          message: `Grup tidak dikenal: "${group}". Grup yang tersedia: ${Object.keys(CACHE_GROUPS).join(", ")}`,
        });
      }

      const deleted = await deleteByPattern(pattern);

      console.log(`🗑️  Cache CLEARED — grup: "${group}" | ${deleted} key dihapus`);

      res.json({
        success: true,
        message: deleted > 0
          ? `✅ Berhasil menghapus ${deleted} key dari grup "${group}"`
          : `⚠️  Tidak ada cache ditemukan untuk grup "${group}"`,
        group,
        pattern,
        deletedCount: deleted,
      });
    } catch (error) {
      console.error("❌ Cache Clear Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ DELETE /admin/cache/key/:key
  // Hapus 1 key spesifik (berguna untuk hapus cache 1 dokter/produk)
  // Contoh: DELETE /admin/cache/key/doctors:detail:abc123
  async clearSingleKey(req, res) {
    try {
      // Key di URL bisa mengandung ":" → decode dulu
      const key = decodeURIComponent(req.params.key);

      // Cek key ada atau tidak dulu
      const existing = await redis.get(key);
      if (existing === null) {
        return res.status(404).json({
          success: false,
          message: `Key "${key}" tidak ditemukan di Redis`,
        });
      }

      await redis.del(key);
      console.log(`🗑️  Cache CLEARED — key: "${key}"`);

      res.json({
        success: true,
        message: `✅ Key "${key}" berhasil dihapus`,
        key,
      });
    } catch (error) {
      console.error("❌ Cache Clear Key Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new CacheController();
