import { Client } from "minio";

// Buat koneksi client MinIO
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "databasedokter-api.dokterapp.my.id",
  port: 443,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// Nama bucket default
const bucketName = "uploads";

// Export dua variabel ini agar bisa diimport di service lain
export { minioClient, bucketName };
