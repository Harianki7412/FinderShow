const express = require("express");
const {
  getCurrentLottery,
  buyTicket,
  getLotteryHistory,
  drawWinner,
} = require("../controllers/lotteryController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware); // ✅ Admin only for all routes below

router.get("/current", getCurrentLottery);
router.post("/buy", buyTicket);
router.get("/history", getLotteryHistory);
router.post("/draw", drawWinner); // ✅ Admin only

module.exports = router;
