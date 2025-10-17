import express from "express";
import { body } from "express-validator";
import validateRequest from "../middleware/validation.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import ChatController from "../controllers/chatController.js";

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
  const controller = ChatController;

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

  return router;
}
export default chatRoutes;
