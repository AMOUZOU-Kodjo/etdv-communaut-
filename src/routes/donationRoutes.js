const { Router } = require("express");
const { makeDonation, confirmDonation, getMyDonations, getAllDonations } = require("../controllers/donationController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = Router();

router.post("/", authenticate, makeDonation);
router.get("/me", authenticate, getMyDonations);
router.get("/", authenticate, authorize("ADMIN", "APOTRE"), getAllDonations);
router.put("/:id/confirm", authenticate, authorize("ADMIN", "APOTRE"), confirmDonation);

module.exports = router;
