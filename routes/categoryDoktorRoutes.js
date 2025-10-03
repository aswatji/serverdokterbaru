const express = require("express");
const router = express.Router();
const categoryDoctorController = require("../controllers/categoryDoctorController");

router.get("/", categoryDoctorController.getAll);
router.get("/:id", categoryDoctorController.getById);
router.post("/", categoryDoctorController.create);
router.put("/:id", categoryDoctorController.update);
router.delete("/:id", categoryDoctorController.delete);

module.exports = router;
