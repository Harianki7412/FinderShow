const ludoGameModel = require("../models/ludoModel");

const getGameState = async (req, res) => {
  try {
    let game = await ludoGameModel.findOne({ user: req.user._id });
    if (!game) {
      game = new ludoGameModel({ user: req.user._id });
      await game.save();
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveGameState = async (req, res) => {
  try {
    const { pawns, finished, turn, dice } = req.body;
    let game = await ludoGameModel.findOne({ user: req.user._id });
    if (game) {
      game.pawns = pawns;
      game.finished = finished;
      game.turn = turn;
      game.dice = dice;
      await game.save();
    } else {
      game = new ludoGameModel({
        user: req.user._id,
        pawns,
        finished,
        turn,
        dice,
      });
      await game.save();
    }
    res.status(200).json({ success: true, game });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetGame = async (req, res) => {
  try {
    await ludoGameModel.findOneAndDelete({ user: req.user._id });
    res.status(200).json({ success: true, message: "Game reset" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getGameState, saveGameState, resetGame };
