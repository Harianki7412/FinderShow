const router = require("express").Router();
const ctrl = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");

router.post("/create-order", protect, ctrl.createOrder);
router.post("/verify", protect, ctrl.verifyPayment);
// /webhook is mounted separately in server.js with raw body
router.post("/webhook", ctrl.webhook);

module.exports = router;
