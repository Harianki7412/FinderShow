const express = require("express");
const {
  getSpinsLeft,
  getSpinHistory,
  performSpin,
} = require("../controllers/spinController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/spins", getSpinsLeft);
router.get("/history", getSpinHistory);
router.post("/spin", performSpin);

module.exports = router;
