const { Router } = require("express");
const { createLiveStream, getLiveStreams, getCurrentLive, getLiveStreamById, updateLiveStream, deleteLiveStream, syncFromYouTube, checkYouTubeVideo } = require("../controllers/liveStreamController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), createLiveStream);
router.get("/", getLiveStreams);
router.get("/current", getCurrentLive);
router.get("/sync/youtube", authenticate, authorize("ADMIN", "APOTRE"), syncFromYouTube);
router.get("/youtube/:videoId", checkYouTubeVideo);
router.get("/:id", getLiveStreamById);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updateLiveStream);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), deleteLiveStream);

module.exports = router;
