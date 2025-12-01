import { PrismaClient } from "@prisma/client";
import MinioService from "../service/minioService.js"; // Sesuaikan path import ini
import { v4 as uuidv4 } from "uuid";
import path from "path";

const prisma = new PrismaClient();

class ProductController {
  // ✅ membuat product
  async createProduct(req, res) {
    try {
      // Saat pakai form-data, angka sering terkirim sebagai string, jadi perlu di-parse
      const { name, price } = req.body;
      let imageUrl = null;

      // Logika Upload ke MinIO
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        // Buat nama file unik: "products/uuid.jpg"
        const fileName = `products/${uuidv4()}${fileExtension}`;
        
        // Upload menggunakan Service yang sudah kamu buat
        const uploadResult = await MinioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );
        
        imageUrl = uploadResult.url;
      }

      const product = await prisma.product.create({
        data: {
          name,
          image: imageUrl, // Simpan URL dari MinIO/Local
          price: parseFloat(price), // Pastikan price jadi number
        },
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      console.error("Create Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ mendapatkan semua product (Tidak berubah)
  async getAllProducts(req, res) {
    try {
      const products = await prisma.product.findMany();
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ mendapatkan product berdasarkan ID (Tidak berubah)
  async getProductById(req, res) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({ where: { id } });
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ memperbarui product berdasarkan ID
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, price } = req.body;

      // Siapkan object update
      const updateData = {
        name,
        price: parseFloat(price),
      };

      // Jika user mengupload gambar baru saat update
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `products/${uuidv4()}${fileExtension}`;

        const uploadResult = await MinioService.uploadFile(
          req.file.buffer,
          fileName,
          req.file.mimetype
        );

        updateData.image = uploadResult.url;
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, data: product });
    } catch (error) {
      console.error("Update Product Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ✅ menghapus product berdasarkan ID
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      // Opsional: Kamu bisa tambahkan logika untuk menghapus file di MinIO juga disini sebelum delete DB
      await prisma.product.delete({ where: { id } });
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

export default new ProductController();