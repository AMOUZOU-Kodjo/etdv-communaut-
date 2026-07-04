const { Router } = require("express");
const { sendContactMessage, getContactMessages, markContactAsRead, deleteContactMessage } = require("../controllers/contactController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", sendContactMessage);
router.get("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), getContactMessages);
router.put("/:id/read", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), markContactAsRead);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE"), deleteContactMessage);

module.exports = router;
