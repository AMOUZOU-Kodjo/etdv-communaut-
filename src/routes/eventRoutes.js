const { Router } = require("express");
const { getEvents, getEventById, createEvent, updateEvent, deleteEvent } = require("../controllers/eventController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

const eventSchema = {
  title: [{ required: true }, { type: "maxLength", value: 200 }],
  date: [{ required: true }],
  description: [{ type: "maxLength", value: 2000 }],
  type: [{ type: "oneOf", values: ["CULTE", "CONFERENCE", "REUNION", "BAPTEME", "MARIAGE", "JEUNE", "FORMATION", "AUTRE"] }],
};

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), validate(eventSchema), createEvent);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updateEvent);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE"), deleteEvent);

module.exports = router;
