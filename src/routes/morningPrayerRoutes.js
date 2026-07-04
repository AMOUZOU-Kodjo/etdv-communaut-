const { Router } = require("express");
const { createMorningPrayer, getMorningPrayers, getMorningPrayerById, updateMorningPrayer, deleteMorningPrayer } = require("../controllers/morningPrayerController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), createMorningPrayer);
router.get("/", getMorningPrayers);
router.get("/:id", getMorningPrayerById);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updateMorningPrayer);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), deleteMorningPrayer);

module.exports = router;
