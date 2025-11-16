import multer from "multer";
import path from "path";

// Konfigurasi Multer untuk menyimpan file di disk
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Tentukan folder penyimpanan
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/\s+/g, "-"); // Ganti spasi dengan dash
    const extension = path.extname(originalName); // ✅ Ambil extension
    const nameWithoutExt = path.basename(originalName, extension); // ✅ Ambil nama tanpa extension
    cb(null, `${timestamp}-${nameWithoutExt}${extension}`); // ✅ Format: 1234567890-filename.jpg
  },
});

// Filter tipe file yang diizinkan
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(
      new Error(
        "Tipe file tidak didukung. Hanya jpg, png, dan pdf yang diizinkan"
      ),
      false
    );
  }
};

// Konfigurasi upload dengan limit 5MB
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

export default upload;
