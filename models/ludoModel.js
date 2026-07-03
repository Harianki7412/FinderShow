const mongoose = require("mongoose");

const ludoGameSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    pawns: {
      type: [[Number]],
      required: true,
      default: [
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
      ],
    },
    finished: {
      type: [Number],
      required: true,
      default: [0, 0, 0, 0],
    },
    turn: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 3,
    },
    dice: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      max: 6,
    },
    humanPlayer: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 3,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LudoGame", ludoGameSchema);
