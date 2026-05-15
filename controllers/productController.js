// import { PrismaClient } from "@prisma/client";
// // Pastikan path import ini mengarah ke file service yang SAMA dengan yang dipakai di Chat
// import minioService from "../service/minioService.js";
// import { v4 as uuidv4 } from "uuid";
// import path from "path";

// const prisma = new PrismaClient();

// // class ProductController {
// //   // ✅ CREATE PRODUCT
// //   async createProduct(req, res) {
// //     try {
// //       const { name, price, description } = req.body;

// //       // --- [BARU] 1. CEK DUPLIKAT ---
// //       // Kita cari produk yang namanya sama persis di database
// //       const existingProduct = await prisma.product.findFirst({
// //         where: {
// //           name: name
// //         }
// //       });

// //       // Jika produk ditemukan, langsung tolak request
// //       if (existingProduct) {
// //         return res.status(409).json({
// //           success: false,
// //           message: `Produk dengan nama "${name}" sudah ada! Mohon gunakan nama lain.`
// //         });
// //       }
// //       // -----------------------------

// //       let imageUrl = null;

// //       // Logika Upload (Hanya dijalankan jika produk belum ada)
// //       if (req.file) {
// //         const sanitizedFilename = req.file.originalname
// //           .replace(/\s/g, "_")
// //           .replace(/[^a-zA-Z0-9.-]/g, "");

// //         const fileName = `products/${Date.now()}-${sanitizedFilename}`;

// //         console.log("📤 Uploading Product Image:", fileName);

// //         const uploadResult = await minioService.uploadFile(
// //           req.file.buffer,
// //           fileName,
// //           req.file.mimetype
// //         );

// //         imageUrl = uploadResult.url || uploadResult;
// //       }

// //       const product = await prisma.product.create({
// //         data: {
// //           name: name,
// //           price: parseFloat(price),
// //           image: imageUrl,
// //           description: description || null,
// //         },
// //       });

// //       res.status(201).json({
// //         success: true,
// //         message: "Produk berhasil dibuat",
// //         data: product
// //       });

// //     } catch (error) {
// //       console.error("❌ Create Product Error:", error);
// //       res.status(500).json({ success: false, message: error.message });
// //     }
// //   }

// //   // ✅ GET ALL PRODUCTS
// //   async getAllProducts(req, res) {
// //     try {
// //       const products = await prisma.product.findMany({
// //         orderBy: { createdAt: 'desc' }
// //       });
// //       res.json({ success: true, data: products });
// //     } catch (error) {
// //       res.status(500).json({ success: false, message: error.message });
// //     }
// //   }

// //   // ✅ GET PRODUCT BY ID
// //   async getProductById(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const product = await prisma.product.findUnique({ where: { id } });
// //       if (!product) {
// //         return res.status(404).json({ success: false, message: "Product not found" });
// //       }
// //       res.json({ success: true, data: product });
// //     } catch (error) {
// //       res.status(500).json({ success: false, message: error.message });
// //     }
// //   }

// //   // ✅ UPDATE PRODUCT
// //   async updateProduct(req, res) {
// //     try {
// //       const { id } = req.params;
// //       const { name, price, description } = req.body;

// //       const existingProduct = await prisma.product.findUnique({ where: { id } });
// //       if (!existingProduct) {
// //         return res.status(404).json({ success: false, message: "Product not found" });
// //       }

// //       // Opsional: Cek duplikat nama saat update (selain produk ini sendiri)
// //       if (name && name !== existingProduct.name) {
// //           const duplicateName = await prisma.product.findFirst({ where: { name } });
// //           if (duplicateName) {
// //             return res.status(409).json({
// //                 success: false,
// //                 message: `Nama "${name}" sudah dipakai produk lain.`
// //             });
// //           }
// //       }

// //       const updateData = {
// //         name,
// //         price: parseFloat(price),
// //         description: description || existingProduct.description,
// //       };

// //       if (req.file) {
// //         const sanitizedFilename = req.file.originalname
// //           .replace(/\s/g, "_")
// //           .replace(/[^a-zA-Z0-9.-]/g, "");
// //         const fileName = `products/${Date.now()}-${sanitizedFilename}`;

// //         const uploadResult = await minioService.uploadFile(
// //           req.file.buffer,
// //           fileName,
// //           req.file.mimetype
// //         );

// //         updateData.image = uploadResult.url || uploadResult;
// //       }

// //       const product = await prisma.product.update({
// //         where: { id },
// //         data: updateData,
// //       });

// //       res.json({ success: true, data: product });
// //     } catch (error) {
// //       console.error("❌ Update Product Error:", error);
// //       res.status(500).json({ success: false, message: error.message });
// //     }
// //   }

// //   // ✅ DELETE PRODUCT
// //   async deleteProduct(req, res) {
// //     try {
// //       const { id } = req.params;
// //       await prisma.product.delete({ where: { id } });
// //       res.json({ success: true, message: "Product deleted successfully" });
// //     } catch (error) {
// //       res.status(500).json({ success: false, message: error.message });
// //     }
// //   }
// // }
// class ProductController {

//   // ✅ [BARU] GET HOME DATA (AGGREGATION)
//   // Endpoint ini sangat efisien untuk React Native Home Screen
//   async getHomeData(req, res) {
//     try {
//       // Kita jalankan 3 query secara paralel agar cepat
//       const [newProducts, popularProducts, recommendedProducts] = await Promise.all([
//         // 1. Produk Baru (Urutkan createdAt desc)
//         prisma.product.findMany({
//           take: 5,
//           orderBy: { createdAt: 'desc' }
//         }),
//         // 2. Produk Populer (Urutkan viewCount desc)
//         prisma.product.findMany({
//           take: 5,
//           orderBy: { viewCount: 'desc' }
//         }),
//         // 3. Rekomendasi (Filter isRecommended = true)
//         prisma.product.findMany({
//           take: 5,
//           where: { isRecommended: true },
//           orderBy: { createdAt: 'desc' }
//         })
//       ]);

//       res.json({
//         success: true,
//         data: {
//           new_arrivals: newProducts,
//           popular: popularProducts,
//           recommended: recommendedProducts
//         }
//       });
//     } catch (error) {
//       console.error("❌ Get Home Data Error:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ CREATE PRODUCT (Updated)
//   async createProduct(req, res) {
//     try {
//       // 🔥 [UPDATE]: Ambil isRecommended dari body
//       // Karena pakai FormData, boolean sering terkirim sebagai string "true"/"false"
//       const { name, price, description, isRecommended } = req.body;

//       // 1. CEK DUPLIKAT
//       const existingProduct = await prisma.product.findFirst({
//         where: { name: name }
//       });

//       if (existingProduct) {
//         return res.status(409).json({
//           success: false,
//           message: `Produk dengan nama "${name}" sudah ada!`
//         });
//       }

//       let imageUrl = null;

//       // Logika Upload Minio
//       if (req.file) {
//         const sanitizedFilename = req.file.originalname
//           .replace(/\s/g, "_")
//           .replace(/[^a-zA-Z0-9.-]/g, "");

//         const fileName = `products/${Date.now()}-${sanitizedFilename}`;

//         const uploadResult = await minioService.uploadFile(
//           req.file.buffer,
//           fileName,
//           req.file.mimetype
//         );

//         imageUrl = uploadResult.url || uploadResult;
//       }

//       // Konversi isRecommended string ke boolean (jika dari form-data)
//       const isRecommendedBool = isRecommended === 'true' || isRecommended === true;

//       const product = await prisma.product.create({
//         data: {
//           name: name,
//           price: parseFloat(price),
//           image: imageUrl, // Sesuaikan dengan schema (imageUrl atau image)
//           description: description || null,
//           isRecommended: isRecommendedBool, // Simpan status rekomendasi
//         },
//       });

//       res.status(201).json({
//         success: true,
//         message: "Produk berhasil dibuat",
//         data: product
//       });

//     } catch (error) {
//       console.error("❌ Create Product Error:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ GET ALL PRODUCTS
//   async getAllProducts(req, res) {
//     try {
//       const products = await prisma.product.findMany({
//         orderBy: { createdAt: 'desc' }
//       });
//       res.json({ success: true, data: products });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ GET PRODUCT BY ID (Updated)
//   async getProductById(req, res) {
//     try {
//       const { id } = req.params;

//       // 🔥 [UPDATE]: Increment viewCount saat detail diambil
//       // Gunakan update, jika gagal (tidak ketemu) akan masuk catch/error handling
//       // Namun, cara aman adalah findUnique dulu atau handle error update record not found

//       const product = await prisma.product.findUnique({ where: { id } });

//       if (!product) {
//         return res.status(404).json({ success: false, message: "Product not found" });
//       }

//       // Jalankan update viewCount di background (asynchronous) agar response tidak lambat
//       // Kita tidak perlu menunggu (await) hasil increment untuk merespon user
//       prisma.product.update({
//         where: { id },
//         data: { viewCount: { increment: 1 } }
//       }).catch(err => console.error("Gagal update view count", err));

//       res.json({ success: true, data: product });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ UPDATE PRODUCT (Updated)
//   async updateProduct(req, res) {
//     try {
//       const { id } = req.params;
//       // 🔥 [UPDATE]: Terima isRecommended
//       const { name, price, description, isRecommended } = req.body;

//       const existingProduct = await prisma.product.findUnique({ where: { id } });
//       if (!existingProduct) {
//         return res.status(404).json({ success: false, message: "Product not found" });
//       }

//       // Cek duplikat nama
//       if (name && name !== existingProduct.name) {
//           const duplicateName = await prisma.product.findFirst({ where: { name } });
//           if (duplicateName) {
//             return res.status(409).json({
//                 success: false,
//                 message: `Nama "${name}" sudah dipakai produk lain.`
//             });
//           }
//       }

//       const updateData = {
//         name,
//         price: parseFloat(price),
//         description: description || existingProduct.description,
//       };

//       // Update isRecommended jika dikirim
//       if (isRecommended !== undefined) {
//         updateData.isRecommended = isRecommended === 'true' || isRecommended === true;
//       }

//       if (req.file) {
//         const sanitizedFilename = req.file.originalname
//           .replace(/\s/g, "_")
//           .replace(/[^a-zA-Z0-9.-]/g, "");
//         const fileName = `products/${Date.now()}-${sanitizedFilename}`;

//         const uploadResult = await minioService.uploadFile(
//           req.file.buffer,
//           fileName,
//           req.file.mimetype
//         );

//         updateData.image = uploadResult.url || uploadResult;
//       }

//       const product = await prisma.product.update({
//         where: { id },
//         data: updateData,
//       });

//       res.json({ success: true, data: product });
//     } catch (error) {
//       console.error("❌ Update Product Error:", error);
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }

//   // ✅ DELETE PRODUCT
//   async deleteProduct(req, res) {
//     try {
//       const { id } = req.params;
//       await prisma.product.delete({ where: { id } });
//       res.json({ success: true, message: "Product deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ success: false, message: error.message });
//     }
//   }
// }

// export default new ProductController();

// controllers/productController.js
// ✅ Final version with Redis Caching
import { PrismaClient } from "@prisma/client";
import minioService from "../service/minioService.js";
import redisClient from "../utils/redisClient.js"; // Pastikan path ini benar
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

      // 🔍 JIKA REDIS KOSONG, QUERY DATABASE PARALEL
      const [newProducts, popularProducts, recommendedProducts] =
        await Promise.all([
          prisma.product.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
          prisma.product.findMany({ take: 5, orderBy: { viewCount: "desc" } }),
          prisma.product.findMany({
            take: 5,
            where: { isRecommended: true },
            orderBy: { createdAt: "desc" },
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
  async createProduct(req, res) {
    try {
      const { name, price, description, isRecommended } = req.body;

      // 1. CEK DUPLIKAT
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

      // Logika Upload Minio
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
        },
      });

      // 🗑️ INVALIDASI CACHE
      await redisClient.del("products:all");
      await redisClient.del("products:home");

      res.status(201).json({
        success: true,
        message: "Produk berhasil dibuat",
        data: product,
      });
    } catch (error) {
      console.error("❌ Create Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ GET ALL PRODUCTS
  async getAllProducts(req, res) {
    try {
      const cacheKey = "products:all";

      // ⚡ CEK REDIS
      const cachedProducts = await redisClient.get(cacheKey);
      if (cachedProducts) {
        return res.json(JSON.parse(cachedProducts));
      }

      const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
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

      // 🔄 INCREMENT VIEW COUNT (Tetap jalan di background ke database)
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

      const product = await prisma.product.findUnique({ where: { id } });

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
      const { name, price, description, isRecommended } = req.body;

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
        price: parseFloat(price),
        description: description || existingProduct.description,
      };

      if (isRecommended !== undefined) {
        updateData.isRecommended =
          isRecommended === "true" || isRecommended === true;
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
      });

      // 🗑️ INVALIDASI CACHE
      await redisClient.del("products:all");
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
      await redisClient.del("products:all");
      await redisClient.del("products:home");
      await redisClient.del(`product:detail:${id}`);

      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ProductController();
