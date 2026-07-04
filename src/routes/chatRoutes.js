const { Router } = require("express");
const {
  startOrGetConversation,
  sendMessage,
  deleteMessage,
  getMyConversations,
  getMessages,
  markAsRead,
} = require("../controllers/chatController");
const { authenticate } = require("../middlewares/auth");

const router = Router();

router.post("/", authenticate, startOrGetConversation);
router.get("/", authenticate, getMyConversations);
router.get("/:roomId", authenticate, getMessages);
router.post("/:roomId/messages", authenticate, sendMessage);
router.delete("/messages/:messageId", authenticate, deleteMessage);
router.put("/:roomId/read", authenticate, markAsRead);

module.exports = router;
