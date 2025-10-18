import { Client } from "minio";

// Buat koneksi client MinIO
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "databasedokter-api.dokterapp.my.id",
  port: 443,
  useSSL: true,
  accessKey: process.env.MINIO_ACCESS_KEY || "aswat",
  secretKey: process.env.MINIO_SECRET_KEY || "Azzam070117",
  region: process.env.MINIO_REGION || "eu-east-1",
});

// Nama bucket default
const bucketName = process.env.MINIO_BUCKET || "uploads";

console.log("🔧 MinIO Config:", {
  endPoint: minioClient.host,
  port: minioClient.port,
  useSSL: minioClient.protocol === "https:",
  bucket: bucketName,
});

// Export dua variabel ini agar bisa diimport di service lain
export { minioClient, bucketName };
