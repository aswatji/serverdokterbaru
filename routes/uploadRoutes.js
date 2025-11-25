// routes/uploadRoutes.js
// ✅ Upload Routes (class-based, seperti userRoutes.js)

import express from "express";
import multer from "multer";
import { body } from "express-validator";
import validateRequest from "../middleware/validation.js";
import UploadController from "../controllers/uploadController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const uploadValidation = [
  body("chatDateId").notEmpty().withMessage("chatDateId wajib diisi"),
  body("sender").notEmpty().withMessage("sender wajib diisi"),
];

/* -------------------------------------------
   📤 UPLOAD ROUTES
------------------------------------------- */

// ⚙️ fungsi untuk inject io dari server.js
function uploadRoutes(io) {
  const controller = new UploadController(io);

  // ✅ Upload file ke MinIO
  router.post(
    "/",
    upload.single("file"),
    uploadValidation,
    validateRequest,
    (req, res) => controller.uploadFile(req, res)
  );

  // ✅ Ambil semua pesan dalam chatDate
  router.get("/:chatDateId", (req, res) => controller.getMessages(req, res));

  return router;
}

export default uploadRoutes;

// routes/uploadRoutes.js

// import express from "express";
// import UploadController from "../controllers/uploadController.js";
// import { upload } from "../middleware/uploadMiddleware.js";
// import { authenticate } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // Single file upload
// router.post(
//   "/",
//   authenticate,
//   upload.single("file"),
//   UploadController.uploadFile
// );

// // Multiple files upload
// router.post(
//   "/multiple",
//   authenticate,
//   upload.array("files", 5), // max 5 files
//   UploadController.uploadMultiple
// );

// export default router;