const { Router } = require("express");
const {
  getPrograms, getProgramById, createProgram,
  updateProgram, deleteProgram, getDailyVerse,
} = require("../controllers/programController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

const programSchema = {
  title: [{ required: true }, { type: "maxLength", value: 200 }],
  type: [{ required: true }, { type: "oneOf", values: ["ANNUEL", "MENSUEL", "HEBDOMADAIRE", "JOURNALIER"] }],
  startDate: [{ required: true }],
  description: [{ type: "maxLength", value: 2000 }],
};

// Routes publiques
router.get("/", getPrograms);
router.get("/daily-verse", getDailyVerse);
router.get("/:id", getProgramById);

// Routes protegees (admin, apotre, pasteur)
router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), validate(programSchema), createProgram);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updateProgram);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE"), deleteProgram);

module.exports = router;
