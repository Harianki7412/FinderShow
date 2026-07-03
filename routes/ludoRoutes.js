const express = require("express");
const {
  getGameState,
  saveGameState,
  resetGame,
} = require("../controllers/ludoController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/state", getGameState);
router.post("/save", saveGameState);
router.put("/save/:id", saveGameState);
router.delete("/reset/:id", resetGame);

module.exports = router;
