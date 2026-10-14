const router = require("express").Router();
const ctrl = require("../controllers/subscriptionController");
const { protect } = require("../middleware/auth");

router.get("/", ctrl.listPlans); // GET /plans
router.get("/me", protect, ctrl.mySubscription);
router.post("/cancel", protect, ctrl.cancelSubscription);

module.exports = router;
