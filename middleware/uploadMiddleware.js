import multer from "multer";

// Konfigurasi Multer untuk menyimpan file di memory (buffer)
const storage = multer.memoryStorage();

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
