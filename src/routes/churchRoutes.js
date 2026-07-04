const { Router } = require("express");
const {
  getChurches, getChurchById, createChurch, updateChurch, deleteChurch,
  getLeadership, getMembers, getVisitors,
} = require("../controllers/churchController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

const churchSchema = {
  name: [{ required: true }, { type: "maxLength", value: 200 }],
  email: [{ type: "email" }],
};

// Gestion des eglises (CRUD)
router.get("/", getChurches);
router.get("/:id", getChurchById);
router.post("/", authenticate, authorize("ADMIN", "APOTRE"), validate(churchSchema), createChurch);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE"), updateChurch);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE"), deleteChurch);

// Annuaires
router.get("/directory/leadership", authenticate, getLeadership);
router.get("/directory/members", authenticate, getMembers);
router.get("/directory/visitors", authenticate, getVisitors);

module.exports = router;
