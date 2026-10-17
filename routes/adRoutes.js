const router = require("express").Router();
const ctrl = require("../controllers/adController");
const rewardCtrl = require("../controllers/rewardController");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");

// Public
router.get("/active", optionalAuth, ctrl.getActiveAd);
router.post("/:id/click", optionalAuth, ctrl.trackClick);

// Rewarded unlock (client)
router.post("/reward/unlock", protect, rewardCtrl.grantUnlock);
router.get("/reward/status", protect, rewardCtrl.rewardStatus);

// AdMob SSV webhook (no auth — Google calls this)
router.get("/reward/ssv", rewardCtrl.admobSSV);
router.post("/reward/ssv", rewardCtrl.admobSSV);

// Admin
router.get("/", protect, adminOnly, ctrl.list);
router.post("/", protect, adminOnly, ctrl.create);
router.put("/:id", protect, adminOnly, ctrl.update);
router.delete("/:id", protect, adminOnly, ctrl.remove);

module.exports = router;
