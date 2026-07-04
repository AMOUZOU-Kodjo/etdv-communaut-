const { Router } = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const chatRoutes = require("./chatRoutes");
const churchRoutes = require("./churchRoutes");
const mediaRoutes = require("./mediaRoutes");
const notificationRoutes = require("./notificationRoutes");
const programRoutes = require("./programRoutes");
const eventRoutes = require("./eventRoutes");
const postRoutes = require("./postRoutes");
const morningPrayerRoutes = require("./morningPrayerRoutes");
const liveStreamRoutes = require("./liveStreamRoutes");
const eventRegistrationRoutes = require("./eventRegistrationRoutes");
const donationRoutes = require("./donationRoutes");
const contactRoutes = require("./contactRoutes");
const statsRoutes = require("./statsRoutes");
const subscriptionRoutes = require("./subscriptionRoutes");

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/chat", chatRoutes);
router.use("/churches", churchRoutes);
router.use("/media", mediaRoutes);
router.use("/notifications", notificationRoutes);
router.use("/programs", programRoutes);
router.use("/events", eventRoutes);
router.use("/posts", postRoutes);
router.use("/prieres-matinales", morningPrayerRoutes);
router.use("/live", liveStreamRoutes);
router.use("/", eventRegistrationRoutes);
router.use("/donations", donationRoutes);
router.use("/contact", contactRoutes);
router.use("/stats", statsRoutes);
router.use("/subscriptions", subscriptionRoutes);

// Route de verification de l'etat du serveur
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ETDV-Communaute API is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
