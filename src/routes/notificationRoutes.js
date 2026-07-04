const { Router } = require("express");
const { getMyNotifications, markAsRead, markAllAsRead, deleteNotification } = require("../controllers/notificationController");
const { authenticate } = require("../middlewares/auth");

const router = Router();

router.get("/", authenticate, getMyNotifications);
router.put("/read-all", authenticate, markAllAsRead);
router.put("/:id/read", authenticate, markAsRead);
router.delete("/:id", authenticate, deleteNotification);

module.exports = router;
