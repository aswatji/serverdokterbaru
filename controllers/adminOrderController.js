import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class AdminOrderController {
  // ✅ 1. MENGAMBIL SEMUA PESANAN (Untuk Dashboard Admin)
  async getAllOrders(req, res) {
    try {
      const { status } = req.query; // Bisa filter misal: ?status=success

      const whereCondition = status ? { status } : {};

      const orders = await prisma.medicineOrder.findMany({
        where: whereCondition,
        include: {
          user: {
            select: { id: true, fullname: true, email: true, phone: true },
          },
          items: {
            include: {
              medicine: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ success: true, data: orders });
    } catch (error) {
      console.error("❌ Admin GetAllOrders Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 2. MENGAMBIL DETAIL SATU PESANAN
  async getOrderById(req, res) {
    try {
      const { id } = req.params;

      const order = await prisma.medicineOrder.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, fullname: true, email: true, phone: true },
          },
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

      res.status(200).json({ success: true, data: order });
    } catch (error) {
      console.error("❌ Admin GetOrderById Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 3. UPDATE STATUS PESANAN (Misal: dari "success" jadi "shipped" atau "completed")
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validasi status yang diizinkan untuk diubah manual oleh admin
      const allowedStatuses = [
        "processing",
        "shipped",
        "completed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status tidak valid. Gunakan salah satu dari: ${allowedStatuses.join(", ")}`,
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

      // Jangan izinkan ubah pesanan yang masih 'pending' pembayaran dari midtrans
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

      res.status(200).json({
        success: true,
        message: `Status pesanan berhasil diubah menjadi ${status}`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error("❌ Admin UpdateOrderStatus Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ 4. STATISTIK PESANAN (Untuk Ringkasan Dashboard Admin)
  async getOrderStats(req, res) {
    try {
      // Menghitung jumlah pesanan berdasarkan status
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

      res.status(200).json({ success: true, data: formattedStats });
    } catch (error) {
      console.error("❌ Admin GetOrderStats Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new AdminOrderController();
