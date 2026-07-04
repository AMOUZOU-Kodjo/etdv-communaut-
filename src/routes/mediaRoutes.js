const { Router } = require("express");
const {
  getPublishedMedia, getMediaById, createMedia, approveMedia,
  updateMedia, deleteMedia, toggleVisibility, getPendingApproval,
} = require("../controllers/mediaController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

const mediaSchema = {
  title: [{ required: true }, { type: "maxLength", value: 200 }],
  type: [{ required: true }, { type: "oneOf", values: ["PHOTO", "AUDIO", "VIDEO"] }],
  url: [{ required: true }],
  description: [{ type: "maxLength", value: 1000 }],
};

// Routes publiques
router.get("/", getPublishedMedia);
router.get("/pending", authenticate, authorize("ADMIN", "APOTRE"), getPendingApproval);
router.get("/:id", getMediaById);

// Routes protegees - publication
router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), validate(mediaSchema), createMedia);

// Routes protegees - gestion (admin et apotres seulement)
router.put("/approve/:id", authenticate, authorize("ADMIN", "APOTRE"), approveMedia);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE"), updateMedia);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE"), deleteMedia);
router.patch("/:id/visibility", authenticate, authorize("ADMIN", "APOTRE"), toggleVisibility);

module.exports = router;
