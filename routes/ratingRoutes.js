const express = require("express");
const { body } = require("express-validator");
const ratingController = require("../controllers/ratingController");
const validateRequest = require("../middleware/validation");

const router = express.Router();

/* -------------------------------------------
   🧾 VALIDATION RULES
------------------------------------------- */
const createOrUpdateRatingValidation = [
  body("doctorId")
    .notEmpty()
    .withMessage("doctorId wajib diisi")
    .isString()
    .withMessage("doctorId harus berupa string"),

  body("userId")
    .notEmpty()
    .withMessage("userId wajib diisi")
    .isString()
    .withMessage("userId harus berupa string"),

  body("rating")
    .notEmpty()
    .withMessage("Rating wajib diisi")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating harus bernilai antara 1 hingga 5"),

  body("comment")
    .optional()
    .isString()
    .withMessage("Comment harus berupa teks"),
];

const deleteRatingValidation = [
  body("doctorId")
    .notEmpty()
    .withMessage("doctorId wajib diisi")
    .isString()
    .withMessage("doctorId harus berupa string"),
  body("userId")
    .notEmpty()
    .withMessage("userId wajib diisi")
    .isString()
    .withMessage("userId harus berupa string"),
];

/* -------------------------------------------
   🚏 ROUTES
------------------------------------------- */
router.post(
  "/",
  createOrUpdateRatingValidation,
  validateRequest,
  ratingController.createOrUpdateRating
);
router.get("/:doctorId", ratingController.getDoctorRatings);
router.delete(
  "/",
  deleteRatingValidation,
  validateRequest,
  ratingController.deleteRating
);

module.exports = router;
