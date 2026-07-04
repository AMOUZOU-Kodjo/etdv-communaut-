const { Router } = require("express");
const { createPost, getPosts, getPostById, updatePost, deletePost, markPostAsRead, getPostReaders } = require("../controllers/postController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), createPost);
router.get("/", getPosts);
router.get("/:id", getPostById);
router.put("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), updatePost);
router.delete("/:id", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), deletePost);

router.post("/:id/read", authenticate, markPostAsRead);
router.get("/:id/readers", authenticate, authorize("ADMIN", "APOTRE", "PASTEUR"), getPostReaders);

module.exports = router;
