import { PrismaClient } from "@prisma/client";
import minioService from "../service/minioService.js";
import redisClient from "../utils/redisClient.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const prisma = new PrismaClient();

class ProductController {
  // ✅ GET HOME DATA (AGGREGATION)
  async getHomeData(req, res) {
    try {
      const cacheKey = "products:home";

      // ⚡ CEK REDIS
      const cachedHome = await redisClient.get(cacheKey);
      if (cachedHome) {
        return res.json(JSON.parse(cachedHome));
      }

      // 🔍 JIKA REDIS KOSONG, QUERY DATABASE PARALEL (Dengan Kategori)
      const [newProducts, popularProducts, recommendedProducts] =
        await Promise.all([
          prisma.product.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: { category: true }, // Ambil relasi kategori
          }),
          prisma.product.findMany({
            take: 5,
            orderBy: { viewCount: "desc" },
            include: { category: true },
          }),
          prisma.product.findMany({
            take: 5,
            where: { isRecommended: true },
            orderBy: { createdAt: "desc" },
            include: { category: true },
          }),
        ]);

      const responseData = {
        success: true,
        data: {
          new_arrivals: newProducts,
          popular: popularProducts,
          recommended: recommendedProducts,
        },
      };

      // 📦 SIMPAN KE REDIS: 5 Menit (300 detik)
      await redisClient.setEx(cacheKey, 300, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      console.error("❌ Get Home Data Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ CREATE PRODUCT
  // async createProduct(req, res) {
  //   try {
  //     // Ditambahkan categoryId
  //     const { name, price, description, isRecommended, categoryId } = req.body;

  //     // 1. CEK DUPLIKAT
  //     const existingProduct = await prisma.product.findFirst({
  //       where: { name: name },
  //     });

  //     if (existingProduct) {
  //       return res.status(409).json({
  //         success: false,
  //         message: `Produk dengan nama "${name}" sudah ada!`,
  //       });
  //     }

  //     let imageUrl = null;

  //     // Logika Upload Minio
  //     if (req.file) {
  //       const sanitizedFilename = req.file.originalname
  //         .replace(/\s/g, "_")
  //         .replace(/[^a-zA-Z0-9.-]/g, "");

  //       const fileName = `products/${Date.now()}-${sanitizedFilename}`;

  //       const uploadResult = await minioService.uploadFile(
  //         req.file.buffer,
  //         fileName,
  //         req.file.mimetype,
  //       );

  //       imageUrl = uploadResult.url || uploadResult;
  //     }

  //     const isRecommendedBool =
  //       isRecommended === "true" || isRecommended === true;

  //     const product = await prisma.product.create({
  //       data: {
  //         name: name,
  //         price: parseFloat(price),
  //         image: imageUrl,
  //         description: description || null,
  //         isRecommended: isRecommendedBool,
  //         categoryId: categoryId || null, // Simpan categoryId jika ada
  //       },
  //       include: { category: true }, // Langsung return data kategori saat selesai create
  //     });

  //     // 🗑️ INVALIDASI CACHE
  //     await redisClient.del("products:all");
  //     await redisClient.del("products:home");

  //     res.status(201).json({
  //       success: true,
  //       message: "Produk berhasil dibuat",
  //       data: product,
  //     });
  //   } catch (error) {
  //     console.error("❌ Create Product Error:", error);
  //     res.status(500).json({ success: false, message: error.message });
  //   }
  // }
  // ✅ CREATE PRODUCT (Mendukung Satuan & Banyak Sekaligus / Bulk)
  async createProduct(req, res) {
    try {
      // 🔹 JIKA DATA YANG DIKIRIM BERBENTUK ARRAY (BANYAK DATA sekaligus dari JSON)
      if (Array.isArray(req.body)) {
        const createdProducts = [];
        const skippedProducts = [];

        for (const item of req.body) {
          const { name, price, description, isRecommended, categoryId } = item;

          // Validasi minimal
          if (!name || !price) {
            skippedProducts.push({
              name: name || "Tanpa Nama",
              reason: "Nama atau Harga kosong",
            });
            continue;
          }

          // 1. CEK DUPLIKAT
          const existingProduct = await prisma.product.findFirst({
            where: { name: name },
          });

          if (existingProduct) {
            skippedProducts.push({
              name,
              reason: "Nama produk sudah ada di database",
            });
            continue;
          }

          const isRecommendedBool =
            isRecommended === "true" || isRecommended === true;

          // 2. SIMPAN KE DATABASE
          const product = await prisma.product.create({
            data: {
              name: name,
              price: parseFloat(price),
              image: null, // Masukan massal via JSON diset tanpa gambar dahulu
              description: description || null,
              isRecommended: isRecommendedBool,
              categoryId: categoryId || null,
            },
          });
          createdProducts.push(product);
        }

        // 🗑️ INVALIDASI CACHE REDIS (Panggil sekali saja di akhir proses)
        await redisClient.del("products:all");
        await redisClient.del("products:home");

        return res.status(201).json({
          success: true,
          message: `Proses impor massal selesai. ${createdProducts.length} produk berhasil dibuat, ${skippedProducts.length} produk dilewati.`,
          inserted_data: createdProducts,
          skipped_data: skippedProducts,
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // 🔹 JIKA YANG DIKIRIM HANYA 1 DATA (Format biasa / Multipart Form-Data)
      // ─────────────────────────────────────────────────────────────────
      const { name, price, description, isRecommended, categoryId } = req.body;

      if (!name || !price) {
        return res.status(400).json({
          success: false,
          message: "Nama produk (name) dan harga (price) wajib diisi!",
        });
      }

      const existingProduct = await prisma.product.findFirst({
        where: { name: name },
      });

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message: `Produk dengan nama "${name}" sudah ada!`,
        });
      }

      let imageUrl = null;

      if (req.file) {
        const sanitizedFilename = req.file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");

        const fileName = `products/${Date.now()}-${sanitizedFilename}`;

        const uploadResult = await minioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype,
        );

        imageUrl = uploadResult.url || uploadResult;
      }

      const isRecommendedBool =
        isRecommended === "true" || isRecommended === true;

      const product = await prisma.product.create({
        data: {
          name: name,
          price: parseFloat(price),
          image: imageUrl,
          description: description || null,
          isRecommended: isRecommendedBool,
          categoryId: categoryId || null,
        },
        include: { category: true },
      });

      await redisClient.del("products:all");
      await redisClient.del("products:home");

      return res.status(201).json({
        success: true,
        message: "Produk berhasil dibuat",
        data: product,
      });
    } catch (error) {
      console.error("❌ Create Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  // ✅ GET ALL PRODUCTS (Bisa filter by categoryId via query params)
  async getAllProducts(req, res) {
    try {
      const { categoryId } = req.query; // Ambil filter kategori dari URL jika ada

      // Jika ada filter kategori, pisahkan cache key-nya
      const cacheKey = categoryId
        ? `products:all:category:${categoryId}`
        : "products:all";

      // ⚡ CEK REDIS
      const cachedProducts = await redisClient.get(cacheKey);
      if (cachedProducts) {
        return res.json(JSON.parse(cachedProducts));
      }

      // Filter database
      const whereCondition = categoryId ? { categoryId: categoryId } : {};

      const products = await prisma.product.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
        include: { category: true }, // Ambil data kategorinya
      });

      const responseData = { success: true, data: products };

      // 📦 SIMPAN KE REDIS (24 Jam)
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ GET PRODUCT BY ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `product:detail:${id}`;

      // 🔄 INCREMENT VIEW COUNT (Tetap jalan di background)
      prisma.product
        .update({
          where: { id },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err) => console.error("Gagal update view count", err));

      // ⚡ CEK REDIS
      const cachedProduct = await redisClient.get(cacheKey);
      if (cachedProduct) {
        return res.json(JSON.parse(cachedProduct));
      }

      const product = await prisma.product.findUnique({
        where: { id },
        include: { category: true }, // Include category
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const responseData = { success: true, data: product };

      // 📦 SIMPAN KE REDIS (24 Jam)
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(responseData));

      res.json(responseData);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ UPDATE PRODUCT
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      // Terima categoryId
      const { name, price, description, isRecommended, categoryId } = req.body;

      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });
      if (!existingProduct) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      if (name && name !== existingProduct.name) {
        const duplicateName = await prisma.product.findFirst({
          where: { name },
        });
        if (duplicateName) {
          return res.status(409).json({
            success: false,
            message: `Nama "${name}" sudah dipakai produk lain.`,
          });
        }
      }

      const updateData = {
        name,
        price: price ? parseFloat(price) : undefined,
        description: description || existingProduct.description,
      };

      if (isRecommended !== undefined) {
        updateData.isRecommended =
          isRecommended === "true" || isRecommended === true;
      }

      // Update categoryId jika dikirim
      if (categoryId !== undefined) {
        updateData.categoryId = categoryId || null;
      }

      if (req.file) {
        const sanitizedFilename = req.file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");
        const fileName = `products/${Date.now()}-${sanitizedFilename}`;

        const uploadResult = await minioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype,
        );

        updateData.image = uploadResult.url || uploadResult;
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true }, // Return category update
      });

      // 🗑️ INVALIDASI CACHE KESELURUHAN & SPESIFIK
      const keysToDelete = await redisClient.keys("products:all*");
      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete); // Hapus semua cache kategori produk
      }
      await redisClient.del("products:home");
      await redisClient.del(`product:detail:${id}`);

      res.json({ success: true, data: product });
    } catch (error) {
      console.error("❌ Update Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ DELETE PRODUCT
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      await prisma.product.delete({ where: { id } });

      // 🗑️ INVALIDASI CACHE
      const keysToDelete = await redisClient.keys("products:all*");
      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
      }
      await redisClient.del("products:home");
      await redisClient.del(`product:detail:${id}`);

      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ProductController();
