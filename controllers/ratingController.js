const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * @desc Tambah atau update rating dokter
 * @route POST /api/ratings
 */
export const createOrUpdateRating = async (req, res) => {
  try {
    const { doctorId, userId, rating, comment } = req.body;

    if (!doctorId || !userId || !rating) {
      return res
        .status(400)
        .json({ message: "doctorId, userId, dan rating wajib diisi" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating harus antara 1 - 5" });
    }

    const newRating = await prisma.doctorRating.upsert({
      where: { doctorId_userId: { doctorId, userId } },
      update: { rating, comment },
      create: { doctorId, userId, rating, comment },
    });

    res.status(201).json({
      message: "Rating berhasil disimpan",
      data: newRating,
    });
  } catch (error) {
    console.error("Error createOrUpdateRating:", error);
    res.status(500).json({ message: "Gagal menyimpan rating" });
  }
};

/**
 * @desc Ambil semua rating dokter + rata-rata
 * @route GET /api/ratings/:doctorId
 */
export const getDoctorRatings = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const ratings = await prisma.doctorRating.findMany({
      where: { doctorId },
      include: {
        user: {
          select: { fullname: true, photo: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const avg = await prisma.doctorRating.aggregate({
      where: { doctorId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      average: avg._avg.rating ?? 0,
      totalRatings: avg._count.rating,
      ratings,
    });
  } catch (error) {
    console.error("Error getDoctorRatings:", error);
    res.status(500).json({ message: "Gagal mengambil rating" });
  }
};

/**
 * @desc Hapus rating user terhadap dokter
 * @route DELETE /api/ratings
 */
export const deleteRating = async (req, res) => {
  try {
    const { doctorId, userId } = req.body;

    await prisma.doctorRating.delete({
      where: { doctorId_userId: { doctorId, userId } },
    });

    res.json({ message: "Rating berhasil dihapus" });
  } catch (error) {
    console.error("Error deleteRating:", error);
    res.status(500).json({ message: "Gagal menghapus rating" });
  }
};
