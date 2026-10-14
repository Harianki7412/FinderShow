const router = require("express").Router();
const ctrl = require("../controllers/watchController");
const { protect } = require("../middleware/auth");
const { attachPlan } = require("../middleware/subscription");

router.post("/start", protect, attachPlan, ctrl.startSession);
router.get("/:sessionId/ad", protect, attachPlan, ctrl.getScheduledAd);
router.post("/:sessionId/ad/:adId/complete", protect, ctrl.recordAdEvent);
router.post("/:sessionId/progress", protect, ctrl.updateProgress);
router.post("/:sessionId/end", protect, ctrl.endSession);

module.exports = router;
