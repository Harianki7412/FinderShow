const mongoose = require("mongoose");

const lotterySchema = new mongoose.Schema(
  {
    drawDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },
    ticketPrice: { type: Number, default: 10 },
    winningNumber: { type: Number },
    prizePool: { type: Number, default: 0 },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    winnerPrize: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Lottery", lotterySchema);
