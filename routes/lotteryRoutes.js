const express = require("express");
const {
  getActiveLotteries,
  getLotteryDetails,
  buyTicket,
  getMyTickets,
  createLottery,
  drawWinner,
  getAllLotteries,
  getLotteryStats,
} = require("../controllers/lotteryController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { adminMiddleware } = require("../middleware/adminMiddleware");

const router = express.Router();

// User routes
router.get("/active", authMiddleware, getActiveLotteries);
router.get("/:id", authMiddleware, getLotteryDetails);
router.post("/buy", authMiddleware, buyTicket);
router.get("/my/tickets", authMiddleware, getMyTickets);

// Admin routes
router.post("/create", authMiddleware, adminMiddleware, createLottery);
router.post("/draw", authMiddleware, adminMiddleware, drawWinner);
router.get("/admin/all", authMiddleware, adminMiddleware, getAllLotteries);
router.get("/admin/stats", authMiddleware, adminMiddleware, getLotteryStats);

module.exports = router;
