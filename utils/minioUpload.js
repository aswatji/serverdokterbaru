import { v4 as uuidv4 } from "uuid";
import { minioClient, bucketName } from "../config/minio.js";

/**
 * Upload file ke MinIO
 * @param {Buffer} buffer - File buffer
 * @param {string} fileName - Path file di bucket (contoh: "chat/123/file.jpg")
 * @param {string} mimeType - MIME type (contoh: "image/jpeg")
 * @returns {Promise<string>} - URL file yang bisa diakses
 */
export async function uploadToMinio(buffer, fileName, mimeType) {
  try {
    const meta = { "Content-Type": mimeType };

    // Upload ke MinIO
    await minioClient.putObject(bucketName, fileName, buffer, meta);

    // Generate public URL
    const fileUrl = `https://${process.env.MINIO_ENDPOINT}/${bucketName}/${fileName}`;

    console.log(`✅ File uploaded to MinIO: ${fileName}`);
    return fileUrl;
  } catch (error) {
    console.error("❌ MinIO upload error:", error);
    throw new Error(`Failed to upload file to MinIO: ${error.message}`);
  }
}

/**
 * Delete file dari MinIO
 * @param {string} fileName - Path file di bucket (contoh: "chat/123/file.jpg")
 * @returns {Promise<void>}
 */
export async function deleteFromMinio(fileName) {
  try {
    await minioClient.removeObject(bucketName, fileName);
    console.log(`✅ File deleted from MinIO: ${fileName}`);
  } catch (error) {
    console.error("❌ MinIO delete error:", error);
    throw new Error(`Failed to delete file from MinIO: ${error.message}`);
  }
}

/**
 * Upload base64 string ke MinIO
 * @param {string} base64Data - Base64 string
 * @param {string} folder - Folder tujuan (contoh: "chat", "profile")
 * @param {string} type - Tipe file ("image" atau "pdf")
 * @returns {Promise<string>} - URL file
 */
export async function uploadBase64ToMinio(
  base64Data,
  folder = "uploads",
  type = "image"
) {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const ext = type === "pdf" ? ".pdf" : ".jpg";
    const fileName = `${folder}/${uuidv4()}${ext}`;
    const mimeType = type === "pdf" ? "application/pdf" : "image/jpeg";

    return await uploadToMinio(buffer, fileName, mimeType);
  } catch (error) {
    console.error("❌ Base64 upload error:", error);
    throw new Error(`Failed to upload base64: ${error.message}`);
  }
}

export default { uploadToMinio, deleteFromMinio, uploadBase64ToMinio };
