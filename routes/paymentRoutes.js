const router = require("express").Router();
const ctrl = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/create-order", protect, ctrl.createOrder);
router.post("/verify", protect, ctrl.verifyPayment);
router.post("/webhook", ctrl.webhook); // raw webhook — no auth

module.exports = router;
