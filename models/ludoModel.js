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
      default: [
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
        [-1, -1, -1, -1],
      ],
    },
    finished: { type: [Number], default: [0, 0, 0, 0] },
    turn: { type: Number, default: 0, min: 0, max: 3 },
    dice: { type: Number, default: 1, min: 1, max: 6 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("LudoGame", ludoGameSchema);
