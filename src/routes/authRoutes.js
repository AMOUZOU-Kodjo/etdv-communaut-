const { Router } = require("express");
const { sendOtp, verifyOtp, register, login, refresh, logout, me } = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");
const validate = require("../middlewares/validate");

const router = Router();

// Schema de validation pour l'inscription
const registerSchema = {
  email: [{ required: true }, { type: "email" }],
  password: [{ required: true }, { type: "minLength", value: 6 }],
  firstName: [{ required: true }, { type: "maxLength", value: 100 }],
  lastName: [{ required: true }, { type: "maxLength", value: 100 }],
  phone: [{ type: "maxLength", value: 20 }],
};

// Schema de validation pour la connexion
const loginSchema = {
  email: [{ required: true }, { type: "email" }],
  password: [{ required: true }],
};

// OTP - authentification sans mot de passe
router.post("/otp/send", sendOtp);
router.post("/otp/verify", verifyOtp);

// Authentification classique (pour les admins)
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);

module.exports = router;
