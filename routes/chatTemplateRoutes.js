import express from "express";
import chatTemplateController from "../controllers/chatTemplateController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Semua route butuh auth
router.use(authMiddleware);

// GET all templates for logged-in doctor
router.get("/", chatTemplateController.getTemplates);

// GET template by ID
router.get("/:id", chatTemplateController.getTemplateById);

// CREATE new template
router.post("/", chatTemplateController.createTemplate);

// UPDATE template
router.put("/:id", chatTemplateController.updateTemplate);

// DELETE template
router.delete("/:id", chatTemplateController.deleteTemplate);

export default router;
