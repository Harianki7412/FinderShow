const router = require("express").Router();
const ctrl = require("../controllers/subscriptionController");
const { protect } = require("../middleware/auth");

router.get("/", ctrl.listPlans);
router.get("/me", protect, ctrl.mySubscription);
router.post("/cancel", protect, ctrl.cancelSubscription);

module.exports = router;
