const mongoose = require("mongoose");

const prizeTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  matchCount: { type: Number, required: true },
  bonusMatch: { type: Boolean, default: false },
  prizePercent: { type: Number, default: 0 },
  fixedPrize: { type: Number, default: 0 },
});

const lotterySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["daily", "weekly", "mega"], default: "daily" },
    drawDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed", "cancelled"],
      default: "upcoming",
    },
    ticketPrice: { type: Number, default: 10 },
    maxNumber: { type: Number, default: 50 },
    maxBonus: { type: Number, default: 10 },
    numbersPerTicket: { type: Number, default: 5 },
    prizeTiers: [prizeTierSchema],
    winningNumbers: { type: [Number], default: [] },
    winningBonus: { type: Number, default: 0 },
    jackpot: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
    totalPrizePool: { type: Number, default: 0 },
    rolloverCount: { type: Number, default: 0 },
    previousJackpot: { type: Number, default: 0 },
  },
  { timestamps: true },
);

lotterySchema.pre("save", function (next) {
  if (this.drawDate < new Date() && this.status === "upcoming") {
    this.status = "active";
  }
  next();
});

module.exports = mongoose.model("lottery", lotterySchema);
