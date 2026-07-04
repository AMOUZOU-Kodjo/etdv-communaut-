const { Router } = require("express");
const { subscribe, unsubscribe, getSubscriptions } = require("../controllers/subscriptionController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", subscribe);
router.post("/unsubscribe", unsubscribe);
router.get("/", authenticate, authorize("ADMIN", "APOTRE"), getSubscriptions);

module.exports = router;
