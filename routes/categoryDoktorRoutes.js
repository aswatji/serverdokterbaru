const express = require("express");
const router = express.Router();
const categoryDoktorController = require("../controllers/categoryDoktorController");

// GET all categories
router.get("/", categoryDoktorController.getAll);

// GET category by id
router.get("/:id", categoryDoktorController.getById);

// CREATE category
router.post("/", categoryDoktorController.create);

// UPDATE category
router.put("/:id", categoryDoktorController.update);

// DELETE category
router.delete("/:id", categoryDoktorController.delete);

module.exports = router;
