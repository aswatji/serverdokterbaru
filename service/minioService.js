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
    // Remove data URI prefix if exists (e.g., "data:image/png;base64,")
    const base64Clean = base64Data.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");
    
    // Determine extension and mime type
    let ext = ".jpg";
    let mimeType = "image/jpeg";
    
    if (type === "pdf" || type === "file") {
      ext = ".pdf";
      mimeType = "application/pdf";
    } else if (type === "image") {
      // Detect image type from base64 header
      if (base64Data.includes("data:image/png")) {
        ext = ".png";
        mimeType = "image/png";
      } else if (base64Data.includes("data:image/jpeg") || base64Data.includes("data:image/jpg")) {
        ext = ".jpg";
        mimeType = "image/jpeg";
      }
    }
    
    const fileName = `chat/${uuidv4()}${ext}`;

    const meta = { "Content-Type": mimeType };

    await minioClient.putObject(bucketName, fileName, buffer, meta);
    const fileUrl = `https://${process.env.MINIO_ENDPOINT}/${bucketName}/${fileName}`;
    
    console.log(`✅ MinIO upload successful: ${fileUrl}`);
    return fileUrl;
  }
}
export default new MinioService();
