const { Router } = require("express");
const { getDashboardStats, getGeneralStats, getChurchStats } = require("../controllers/statsController");
const { authenticate, authorize } = require("../middlewares/auth");
const { trackPageView } = require("../utils/tracking");

const router = Router();

router.get("/dashboard", authenticate, authorize("ADMIN", "APOTRE"), getDashboardStats);
router.get("/", authenticate, getGeneralStats);
router.get("/churches/:churchId", authenticate, getChurchStats);

// Endpoint public pour tracker les vues de pages
router.post("/track", (req, res) => {
  const { page, referrer } = req.body;
  const ip = req.ip || req.socket?.remoteAddress;
  const userAgent = req.headers["user-agent"];
  trackPageView({ page, referrer, ip, userAgent, userId: req.user?.userId });
  res.json({ success: true });
});

module.exports = router;
