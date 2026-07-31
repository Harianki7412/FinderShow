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

router.get("/current", getCurrentLottery);
router.post("/buy", buyTicket);
router.get("/history", getLotteryHistory);
router.post("/draw", adminMiddleware, drawWinner); // Admin only

module.exports = router;
