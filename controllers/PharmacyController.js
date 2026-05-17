import { PrismaClient } from "@prisma/client";
import midtransClient from "midtrans-client";
import redis from "../utils/redisClient.js";

const prisma = new PrismaClient();

// TTL cache order user — 2 menit cukup, order status cepat berubah
const USER_ORDERS_TTL = 120;
const ORDER_DETAIL_TTL = 120;

class PharmacyController {
  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    // Binding semua method agar konteks 'this' tidak hilang saat dipanggil router
    this.createMedicineOrder = this.createMedicineOrder.bind(this);
    this.getUserOrders = this.getUserOrders.bind(this);
    this.getOrderById = this.getOrderById.bind(this);
    this.retryMedicinePayment = this.retryMedicinePayment.bind(this);
  }

  // ✅ 1. Buat Pesanan Obat dan Pembayaran
  async createMedicineOrder(req, res) {
    try {
      const { items, totalAmount, shippingAddress } = req.body;
      const { id: userId, fullname, email, phone } = req.user;

      if (!items || items.length === 0 || !totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Items and totalAmount are required",
        });
      }

      // 🔹 A. Simpan ke database menggunakan Nested Writes Prisma
      const order = await prisma.medicineOrder.create({
        data: {
          userId,
          amount: parseFloat(totalAmount),
          status: "pending",
          address: shippingAddress || "",
          items: {
            create: items.map((item) => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });
      const itemSubtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      // 2. Hitung selisihnya (ini adalah ongkir atau biaya tambahan lainnya)
      const deliveryFee = order.amount - itemSubtotal;

      const midtransItems = items.map((item) => ({
        id: String(item.medicineId),
        price: item.price,
        quantity: item.quantity,
        name: item.name ? item.name.substring(0, 50) : "Obat/Produk Apotek",
      }));

      // 4. Jika ada biaya ongkir, masukkan ongkir tersebut sebagai "item" tambahan agar hitungannya pas!
      if (deliveryFee > 0) {
        midtransItems.push({
          id: "DELIVERY-FEE",
          price: deliveryFee,
          quantity: 1,
          name: "Biaya Pengiriman",
        });
      }
      // 🔹 B. Siapkan parameter Midtrans
      // ⚠️ PENTING: Gunakan prefix "MED-" agar midtransCallback bisa membedakan transaksi ini dengan chat dokter
      const parameter = {
        transaction_details: {
          order_id: `MED-${order.id}`,
          gross_amount: order.amount,
        },
        customer_details: {
          first_name: fullname || "User",
          email: email || "user@example.com",
          phone: phone || "08123456789",
        },
        // Opsional: Kirim detail item ke Midtrans (Maksimal nama produk 50 karakter)
        item_details: items.map((item) => ({
          id: item.medicineId,
          price: item.price,
          quantity: item.quantity,
          name: item.name ? item.name.substring(0, 50) : "Obat/Produk Apotek",
        })),
      };

      // 🔹 C. Buat transaksi ke Midtrans
      const transaction = await this.snap.createTransaction(parameter);

      // 🔹 D. Update order dengan token pembayaran
      await prisma.medicineOrder.update({
        where: { id: order.id },
        data: {
          snapToken: transaction.token,
          redirectUrl: transaction.redirect_url,
        },
      });

      // 🗑️ Invalidate cache list order user agar langsung terupdate
      await redis.del(`pharmacy:user_orders:${userId}`);

      return res.status(201).json({
        success: true,
        message: "Medicine order created successfully",
        data: {
          orderId: order.id,
          midtrans_order_id: `MED-${order.id}`,
          gross_amount: order.amount,
          redirect_url: transaction.redirect_url,
          token: transaction.token,
        },
      });
    } catch (error) {
      console.error("❌ createMedicineOrder error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create medicine order",
        error: error.message,
      });
    }
  }

  // ✅ 2. Ambil semua pesanan obat milik user login → Cache 2 menit per userId
  async getUserOrders(req, res) {
    try {
      const { id: userId } = req.user;
      const key = `pharmacy:user_orders:${userId}`;

      // ── Cache HIT ──
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res
          .status(200)
          .json({ success: true, source: "cache", data: JSON.parse(cached) });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const orders = await prisma.medicineOrder.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              medicine: { select: { name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      await redis.setEx(key, USER_ORDERS_TTL, JSON.stringify(orders));

      res.status(200).json({ success: true, source: "db", data: orders });
    } catch (error) {
      console.error("❌ getUserOrders error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user orders",
        error: error.message,
      });
    }
  }

  // ✅ 3. Ambil detail pesanan obat spesifik → Cache 2 menit per orderId
  async getOrderById(req, res) {
    try {
      const { id } = req.params;
      const key = `pharmacy:order_detail:${id}`;

      // ── Cache HIT ──
      const cached = await redis.get(key);
      if (cached) {
        console.log(`✅ Cache HIT: ${key}`);
        return res
          .status(200)
          .json({ success: true, source: "cache", data: JSON.parse(cached) });
      }

      // ── Cache MISS → Query database ──
      console.log(`🔄 Cache MISS: ${key}`);
      const order = await prisma.medicineOrder.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
          user: {
            select: { id: true, fullname: true, email: true, phone: true },
          },
        },
      });

      if (!order) {
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      }

      await redis.setEx(key, ORDER_DETAIL_TTL, JSON.stringify(order));

      res.status(200).json({ success: true, source: "db", data: order });
    } catch (error) {
      console.error("❌ getOrderById error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch order",
        error: error.message,
      });
    }
  }

  // ✅ 4. Retry Payment untuk Belanja Obat
  async retryMedicinePayment(req, res) {
    try {
      const { id } = req.params;

      const order = await prisma.medicineOrder.findUnique({
        where: { id: String(id) },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Pesanan obat tidak ditemukan",
        });
      }

      // Validasi status agar tidak double bayar
      if (order.status === "success") {
        return res.status(400).json({
          success: false,
          message: "Pesanan ini sudah lunas.",
        });
      }

      if (!order.snapToken) {
        return res.status(400).json({
          success: false,
          message:
            "Sesi pembayaran belum tersimpan. Silakan buat pesanan baru.",
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          token: order.snapToken,
          redirect_url: order.redirectUrl,
          order_id: order.id,
          midtrans_order_id: `MED-${order.id}`,
        },
      });
    } catch (error) {
      console.error("❌ retryMedicinePayment error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal mengambil sesi pembayaran",
        error: error.message,
      });
    }
  }
}

export default new PharmacyController();
