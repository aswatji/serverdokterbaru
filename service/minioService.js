import { v4 as uuidv4 } from "uuid";
import { minioClient, bucketName } from "../config/minio.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service untuk upload file ke MinIO dengan fallback ke local storage
 */
export class MinioService {
  /**
   * Upload file buffer (dari Multer) ke MinIO
   * @param {Buffer} buffer - File buffer dari Multer
   * @param {string} fileName - Nama file dengan path (e.g., "chat/chatId/filename.jpg")
   * @param {string} mimeType - MIME type (e.g., "image/jpeg")
   * @returns {Promise<{url: string}>}
   */
  async uploadFile(buffer, fileName, mimeType) {
    try {
      console.log(
        `📤 Starting MinIO upload - File: ${fileName}, Type: ${mimeType}, Size: ${buffer.length} bytes`
      );

      const meta = {
        "Content-Type": mimeType,
        "x-amz-acl": "public-read",
      };

      try {
        // Upload to MinIO
        await minioClient.putObject(
          bucketName,
          fileName,
          buffer,
          buffer.length,
          meta
        );

        // Generate public URL
        const endpoint = process.env.MINIO_ENDPOINT;
        const fileUrl = `https://${endpoint}/${bucketName}/${fileName}`;

        console.log(`✅ MinIO upload successful: ${fileUrl}`);
        return { url: fileUrl };
      } catch (minioError) {
        console.warn(
          "⚠️ MinIO upload failed, falling back to local storage:",
          minioError.message
        );

        // Fallback: Save to local filesystem
        const uploadsDir = path.join(__dirname, "..", "uploads");
        const filePath = path.join(uploadsDir, fileName);
        const fileDir = path.dirname(filePath);

        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }

        // Write file to disk
        fs.writeFileSync(filePath, buffer);

        // Return local URL
        const localUrl = `/uploads/${fileName}`;
        console.log(`✅ Saved to local storage: ${localUrl}`);

        return { url: localUrl };
      }
    } catch (error) {
      console.error("❌ Upload failed completely:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadBase64(base64Data, type = "image") {
    try {
      console.log(
        `📤 Starting MinIO upload - Type: ${type}, Data length: ${
          base64Data?.length || 0
        }`
      );

      // Remove data URI prefix if exists (e.g., "data:image/png;base64,")
      const base64Clean = base64Data.replace(/^data:.*;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");

      console.log(`📦 Buffer size: ${buffer.length} bytes`);

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
        } else if (
          base64Data.includes("data:image/jpeg") ||
          base64Data.includes("data:image/jpg")
        ) {
          ext = ".jpg";
          mimeType = "image/jpeg";
        }
      }

      const fileName = `chat/${uuidv4()}${ext}`;
      console.log(`📝 Uploading to: ${bucketName}/${fileName}`);

      const meta = {
        "Content-Type": mimeType,
        "x-amz-acl": "public-read", // Make file publicly accessible
      };

      // Try to upload to MinIO first
      try {
        await minioClient.putObject(
          bucketName,
          fileName,
          buffer,
          buffer.length,
          meta
        );

        // Generate public URL
        const endpoint = process.env.MINIO_ENDPOINT;
        const fileUrl = `https://${endpoint}/${bucketName}/${fileName}`;

        console.log(`✅ MinIO upload successful: ${fileUrl}`);
        return fileUrl;
      } catch (minioError) {
        console.warn(
          "⚠️ MinIO upload failed, falling back to local storage:",
          minioError.message
        );

        // Fallback: Save to local filesystem
        const uploadsDir = path.join(__dirname, "..", "uploads", "chat");

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const localFileName = `${uuidv4()}${ext}`;
        const localFilePath = path.join(uploadsDir, localFileName);

        // Write file to disk
        fs.writeFileSync(localFilePath, buffer);

        // Return local URL
        const localUrl = `/uploads/chat/${localFileName}`;
        console.log(`✅ Saved to local storage: ${localUrl}`);

        return localUrl;
      }
    } catch (error) {
      console.error("❌ Upload failed completely:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
}
export default new MinioService();
