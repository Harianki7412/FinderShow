const ludoGameModel = require("../models/ludoGame"); // ✅ change to match your file name

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

const saveGameState = async (req, res) => {
  try {
    const userId = req.user._id;
    const { pawns, finished, turn, dice, humanPlayer } = req.body;
    if (!pawns || !finished || turn === undefined || dice === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: pawns, finished, turn, dice",
      });
    }
    let game = await ludoGameModel.findOne({ user: userId });
    if (game) {
      game.pawns = pawns;
      game.finished = finished;
      game.turn = turn;
      game.dice = dice;
      if (humanPlayer !== undefined) game.humanPlayer = humanPlayer;
      await game.save();
    } else {
      game = new ludoGameModel({
        user: userId,
        pawns,
        finished,
        turn,
        dice,
        humanPlayer: humanPlayer || 0,
      });
      await game.save();
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    console.error("saveGameState error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

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
