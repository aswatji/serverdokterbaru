import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import ChatController from "../controllers/chatController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION
------------------------------------------- */
const sendMessageValidation = [
  body("content")
    .notEmpty()
    .withMessage("Content is required")
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage("Message must be 1–1000 characters"),
];

/* -------------------------------------------
   💬 ROUTES
------------------------------------------- */
function chatRoutes(io) {
  const controller = new ChatController();

  router.get("/", authMiddleware, (req, res) =>
    controller.getAllChats(req, res)
  );
  router.post("/", authMiddleware, (req, res) =>
    controller.createChat(req, res)
  );
  router.get("/:chatKey/messages", authMiddleware, (req, res) =>
    controller.getMessages(req, res)
  );
  router.post(
    "/:chatKey/send",
    authMiddleware,
    sendMessageValidation,
    validateRequest,
    (req, res) => controller.sendMessage(req, res)
  );

  // 📤 Upload file (image/pdf)
  router.post(
    "/:chatKey/send/file",
    authMiddleware,
    upload.single("file"), // Multer middleware
    (req, res) => controller.sendFileMessage(req, res)
  );

  // 🗑️ Delete message
  router.delete("/message/:messageId", authMiddleware, (req, res) =>
    controller.deleteMessage(req, res)
  );
// ✏️ Edit message
  router.put(
  "/message/:messageId", 
  authMiddleware, // Middleware Auth (Wajib, karena controller butuh req.user)
  (req, res) => controller.editMessage(req, res)
);
  // 🔄 Extend chat session

  router.post("/extend", authMiddleware, (req, res) => controller.extendSession(req, res));

  return router;
}
export default chatRoutes;
