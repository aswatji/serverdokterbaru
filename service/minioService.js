import { v4 as uuidv4 } from "uuid";
import { minioClient, bucketName } from "../config/minio.js";

/**
 * Upload file ke MinIO dan kembalikan URL-nya
 * @param {string} bucket - Nama bucket di MinIO
 * @param {string} fileName - Nama file unik
 * @param {Buffer} buffer - Isi file (dalam bentuk buffer)
 * @param {string} mimeType - MIME type (contoh: 'image/jpeg')
 * @returns {Promise<string>} - URL file yang bisa diakses
 */
export async function uploadToMinio(bucket, fileName, buffer, mimeType) {
  const meta = { "Content-Type": mimeType };

  await minioClient.putObject(bucket, fileName, buffer, meta);

  const fileUrl = `https://${process.env.MINIO_ENDPOINT}/${bucket}/${fileName}`;
  return fileUrl;
}

/**
 * (Opsional) Kalau kamu masih mau pakai class seperti sebelumnya
 */
export class MinioService {
  async uploadBase64(base64Data, type = "image") {
    const buffer = Buffer.from(base64Data, "base64");
    const ext = type === "pdf" ? ".pdf" : ".jpg";
    const fileName = `${uuidv4()}${ext}`;

    const meta = {
      "Content-Type": type === "pdf" ? "application/pdf" : "image/jpeg",
    };

    await minioClient.putObject(bucketName, fileName, buffer, meta);
    const fileUrl = `https://${process.env.MINIO_ENDPOINT}/${bucketName}/${fileName}`;
    return fileUrl;
  }
}
export default new MinioService();
