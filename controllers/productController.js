const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Controller untuk mengelola produk
class ProductController {
  // ✅ membuat product
  async create(req, res) {
    const { name, image, price } = req.body;
    const product = await prisma.product.create({
      data: { name, image, price },
    });
    res.status(201).json({ success: true, data: product });
  }
  // ✅ mendapatkan semua product
  async getAll(req, res) {
    const products = await prisma.product.findMany();
    res.json({ success: true, data: products });
  }
  // ✅ mendapatkan product berdasarkan ID
  async getById(req, res) {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  }
  // ✅ memperbarui product berdasarkan ID
  async update(req, res) {
    const { id } = req.params;
    const { name, image, price } = req.body;
    const product = await prisma.product.update({
      where: { id },
      data: { name, image, price },
    });
    res.json({ success: true, data: product });
  }
  // ✅ menghapus product berdasarkan ID
  async delete(req, res) {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: "Product deleted successfully" });
  }
}

module.exports = new ProductController();
