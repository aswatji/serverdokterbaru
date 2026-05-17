import { PrismaClient } from "@prisma/client";
import redis from "../utils/redisClient.js";

const prisma = new PrismaClient();

// ──────────────────────────────────────────────
//  🔑  Konstanta TTL (Time-To-Live) cache Redis
// ──────────────────────────────────────────────
const TTL = {
  ALL_ORDERS: 60,        // 60 detik  — list order sering berubah
  ORDER_DETAIL: 120,     // 2 menit   — detail order jarang berubah
  ORDER_STATS: 300,      // 5 menit   — statistik tidak perlu real-time
};

// ──────────────────────────────────────────────
//  🔧  Helper: Buat cache key yang konsisten
// ──────────────────────────────────────────────
const cacheKey = {
  allOrders: (status = "all") => `admin:orders:list:${status}`,
  orderDetail: (id)           => `admin:orders:detail:${id}`,
  orderStats: ()              => `admin:orders:stats`,
};

// ──────────────────────────────────────────────
//  🧹  Helper: Invalidate cache terkait 1 order
//      Dipanggil setelah data order berubah
// ──────────────────────────────────────────────
const invalidateOrderCache = async (orderId) => {
  // Hapus cache detail order yang berubah
  await redis.del(cacheKey.orderDetail(orderId));

  // Hapus semua varian cache list (all, pending, shipped, dll)
  const statuses = ["all", "pending", "processing", "shipped", "completed", "cancelled"];
  await Promise.all(statuses.map((s) => redis.del(cacheKey.allOrders(s))));

  // Hapus juga cache statistik supaya angka terupdate
  await redis.del(cacheKey.orderStats());

  console.log(`🗑️  Cache invalidated untuk order: ${orderId}`);
};

// ──────────────────────────────────────────────────────────────────────────────
class AdminOrderController {

  // ✅ 1. MENGAMBIL SEMUA PESANAN (Untuk Dashboard Admin)
  //    → Cache 60 detik per filter status
  async getAllOrders(req, res) {
    try {
      const { status } = req.query; // ?status=shipped (opsional)
      const key = cacheKey.allOrders(status || "all");

      // ── 1a. Coba ambil dari cache dulu ──
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.status(200).json({
          success: true,
          source: "cache",          // 🔍 Berguna untuk debugging
          data: JSON.parse(cached),
        });
      }

      // ── 1b. Cache MISS → Ambil dari database ──
      console.log(`🔄 Cache MISS: ${key} — query ke database`);
      const whereCondition = status ? { status } : {};

      const orders = await prisma.medicineOrder.findMany({
        where: whereCondition,
        include: {
          user: { select: { id: true, fullname: true, email: true } },
          items: {
            include: {
              medicine: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // ── 1c. Simpan hasil ke Redis ──
      await redis.setEx(key, TTL.ALL_ORDERS, JSON.stringify(orders));

      res.status(200).json({ success: true, source: "db", data: orders });
    } catch (error) {
      console.error("❌ Admin GetAllOrders Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 2. MENGAMBIL DETAIL SATU PESANAN
  //    → Cache 2 menit per ID
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const key = cacheKey.orderDetail(id);

      // ── Cache HIT ──
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.status(200).json({
          success: true,
          source: "cache",
          data: JSON.parse(cached),
        });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const order = await prisma.medicineOrder.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, fullname: true, email: true } },
          items: {
            include: {
              medicine: { select: { name: true, price: true, image: true } },
            },
          },
        },
      });

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Pesanan tidak ditemukan" });
      }

      // ── Simpan ke Redis ──
      await redis.setEx(key, TTL.ORDER_DETAIL, JSON.stringify(order));

      res.status(200).json({ success: true, source: "db", data: order });
    } catch (error) {
      console.error("❌ Admin GetOrderById Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 3. UPDATE STATUS PESANAN
  //    → Setelah update, INVALIDATE cache terkait agar data fresh
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const allowedStatuses = ["processing", "shipped", "completed", "cancelled"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status tidak valid. Gunakan: ${allowedStatuses.join(", ")}`,
        });
      }

      const existingOrder = await prisma.medicineOrder.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        return res
          .status(404)
          .json({ success: false, message: "Pesanan tidak ditemukan" });
      }

      if (existingOrder.status === "pending" && status !== "cancelled") {
        return res.status(400).json({
          success: false,
          message: "Tidak bisa memproses pesanan yang belum dibayar (pending).",
        });
      }

      const updatedOrder = await prisma.medicineOrder.update({
        where: { id },
        data: { status },
      });

      // ── 🗑️ Invalidate semua cache terkait order ini ──
      await invalidateOrderCache(id);

      res.status(200).json({
        success: true,
        message: `Status pesanan berhasil diubah menjadi "${status}"`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("❌ Admin UpdateOrderStatus Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 4. STATISTIK PESANAN (Untuk Ringkasan Dashboard Admin)
  //    → Cache 5 menit karena tidak perlu real-time
  async getOrderStats(req, res) {
    try {
      const key = cacheKey.orderStats();

      // ── Cache HIT ──
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res.status(200).json({
          success: true,
          source: "cache",
          data: JSON.parse(cached),
        });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const stats = await prisma.medicineOrder.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true },
      });

      const formattedStats = stats.map((item) => ({
        status: item.status,
        count: item._count.id,
        revenue: item._sum.amount || 0,
      }));

      // ── Simpan ke Redis ──
      await redis.setEx(key, TTL.ORDER_STATS, JSON.stringify(formattedStats));

      res.status(200).json({ success: true, source: "db", data: formattedStats });
    } catch (error) {
      console.error("❌ Admin GetOrderStats Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new AdminOrderController();
