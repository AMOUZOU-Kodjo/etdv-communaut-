const { Router } = require("express");
const { registerForEvent, validateRegistration, getReceipt, getMyRegistrations, getEventRegistrations, cancelRegistration } = require("../controllers/eventRegistrationController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/events/:eventId/register", authenticate, registerForEvent);
router.put("/registrations/:registrationId/validate", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), validateRegistration);
router.get("/registrations/me", authenticate, getMyRegistrations);
router.get("/events/:eventId/registrations", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), getEventRegistrations);
router.get("/registrations/:registrationId/receipt", authenticate, getReceipt);
router.delete("/registrations/:registrationId", authenticate, cancelRegistration);

module.exports = router;
