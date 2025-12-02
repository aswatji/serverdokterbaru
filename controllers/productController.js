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
      const { name, price, description } = req.body;

      // --- [BARU] 1. CEK DUPLIKAT ---
      // Kita cari produk yang namanya sama persis di database
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: name
        }
      });

      // Jika produk ditemukan, langsung tolak request
      if (existingProduct) {
        return res.status(409).json({ 
          success: false, 
          message: `Produk dengan nama "${name}" sudah ada! Mohon gunakan nama lain.` 
        });
      }
      // -----------------------------

      let imageUrl = null;

      // Logika Upload (Hanya dijalankan jika produk belum ada)
      if (req.file) {
        const sanitizedFilename = req.file.originalname
          .replace(/\s/g, "_")
          .replace(/[^a-zA-Z0-9.-]/g, "");
        
        const fileName = `products/${Date.now()}-${sanitizedFilename}`;

        console.log("📤 Uploading Product Image:", fileName);

        const uploadResult = await minioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        imageUrl = uploadResult.url || uploadResult;
      }

      const product = await prisma.product.create({
        data: {
          name: name,
          price: parseFloat(price),
          image: imageUrl, 
          description: description || null, 
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
        orderBy: { createdAt: 'desc' }
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
      const { name, price, description } = req.body; 

      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        return res.status(404).json({ success: false, message: "Product not found" });
      }

      // Opsional: Cek duplikat nama saat update (selain produk ini sendiri)
      if (name && name !== existingProduct.name) {
          const duplicateName = await prisma.product.findFirst({ where: { name } });
          if (duplicateName) {
            return res.status(409).json({ 
                success: false, 
                message: `Nama "${name}" sudah dipakai produk lain.` 
            });
          }
      }

      const updateData = {
        name,
        price: parseFloat(price),
        description: description || existingProduct.description,
      };

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
