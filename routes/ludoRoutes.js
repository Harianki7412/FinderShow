const express = require("express");
const {
  getGameState,
  saveGameState,
  resetGame,
} = require("../controllers/ludoController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get("/state", getGameState);
router.post("/save", saveGameState);
router.put("/save/:id", saveGameState); // Uses the same controller (ignores :id)
router.delete("/reset/:id", resetGame); // Uses the same controller

module.exports = router;
