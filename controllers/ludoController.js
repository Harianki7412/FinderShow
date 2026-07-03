const ludoGameModel = require("../models/LudoGame");

// ─── Get or create game ──────────────────────────────────────────
const getGameState = async (req, res) => {
  try {
    const userId = req.user._id;
    let game = await ludoGameModel.findOne({ user: userId });
    if (!game) {
      game = new ludoGameModel({ user: userId });
      await game.save();
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    console.error("getGameState error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Save game (create or update) ──────────────────────────────
const saveGameState = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pawns, finished, turn, dice, humanPlayer } = req.body;
    let game = await ludoGameModel.findOne({ user: userId });
    if (game) {
      game.pawns = pawns;
      game.finished = finished;
      game.turn = turn;
      game.dice = dice;
      game.humanPlayer = humanPlayer;
      await game.save();
    } else {
      game = new ludoGameModel({
        user: userId,
        pawns,
        finished,
        turn,
        dice,
        humanPlayer,
      });
      await game.save();
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    console.error("saveGameState error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Reset game ──────────────────────────────────────────────────
const resetGame = async (req, res) => {
  try {
    const userId = req.user._id;
    await ludoGameModel.findOneAndDelete({ user: userId });
    res.status(200).json({ success: true, message: "Game reset" });
  } catch (error) {
    console.error("resetGame error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getGameState, saveGameState, resetGame };
