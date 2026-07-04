const { Router } = require("express");
const { getUsers, getUserById, getProfileVisitStats, updateUser, deleteUser, updateProfile, changePassword, createMember, deleteAvatar } = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

// Schema de validation pour la mise a jour du profil
const updateProfileSchema = {
  bio: [{ type: "maxLength", value: 500 }],
  gender: [{ type: "oneOf", values: ["HOMME", "FEMME"] }],
  maritalStatus: [{ type: "oneOf", values: ["CELIBATAIRE", "MARIE", "DIVORCE", "VEUF"] }],
  ministry: [{
    type: "oneOf",
    values: ["PASTEUR_TITULAIRE", "PASTEUR_ADJOINT", "APOTRE", "DIACRE", "DIACONESSE", "MAMAN_PASTEUR", "EVANGELISTE", "ENSEIGNANT", "RESPONSABLE_JEUNESSE", "RESPONSABLE_ADORATION", "AUCUN"],
  }],
  profession: [{ type: "maxLength", value: 200 }],
  city: [{ type: "maxLength", value: 100 }],
  country: [{ type: "maxLength", value: 100 }],
};

// Schema de validation pour le changement de mot de passe
const changePasswordSchema = {
  currentPassword: [{ required: true }],
  newPassword: [{ required: true }, { type: "minLength", value: 6 }],
};

router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), createMember);
router.get("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), getUsers);
router.get("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), getUserById);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updateUser);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), deleteUser);
router.put("/profile/me", authenticate, validate(updateProfileSchema), updateProfile);
router.delete("/profile/avatar", authenticate, deleteAvatar);
router.put("/password/me", authenticate, validate(changePasswordSchema), changePassword);
router.get("/:id/visits", authenticate, getProfileVisitStats);

module.exports = router;
