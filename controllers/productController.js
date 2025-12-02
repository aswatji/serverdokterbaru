import { PrismaClient } from "@prisma/client";
// Pastikan path import ini mengarah ke file service yang SAMA dengan yang dipakai di Chat
import minioService from "../service/minioService.js"; 
import { v4 as uuidv4 } from "uuid";
import path from "path";

const prisma = new PrismaClient();

class ProductController {
  // ✅ CREATE PRODUCT
  async createProduct(req, res) {
    try {
      const { name, price } = req.body;
      let imageUrl = null;

      // Logika Upload (Persis seperti Chat)
      if (req.file) {
        // 1. Bersihkan nama file (hapus spasi, dll)
        const sanitizedFilename = req.file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");
        
        // 2. Buat path unik: products/TIMESTAMP-namafile.jpg
        const fileName = `products/${Date.now()}-${sanitizedFilename}`;

        console.log("📤 Uploading Product Image:", fileName);

        // 3. Panggil Service MinIO
        const uploadResult = await minioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        // 4. Ambil URL (handle jika result berupa object atau string)
        imageUrl = uploadResult.url || uploadResult;
      }

      // 5. Simpan ke Database Prisma
      const product = await prisma.product.create({
        data: {
          name: name,
          price: parseFloat(price), // Pastikan harga jadi angka
          image: imageUrl,          // Simpan URL MinIO disini
        },
      });

      res.status(201).json({ 
        success: true, 
        message: "Produk berhasil dibuat",
        data: product 
      });

    } catch (error) {
      console.error("❌ Create Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ GET ALL PRODUCTS
  async getAllProducts(req, res) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' } // Urutkan dari yang terbaru
      });
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ GET PRODUCT BY ID
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ UPDATE PRODUCT
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, price } = req.body;

      // Cek dulu apakah produk ada
      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      const updateData = {
        name,
        price: parseFloat(price),
      };

      // Jika ada gambar baru di-upload
      if (req.file) {
        const sanitizedFilename = req.file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");
        const fileName = `products/${Date.now()}-${sanitizedFilename}`;

        const uploadResult = await minioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        updateData.image = uploadResult.url || uploadResult;
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      });

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
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ProductController();