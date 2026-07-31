const mongoose = require("mongoose");

const prizeTierSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Jackpot", "2nd Prize", etc.
  matchCount: { type: Number, required: true }, // numbers matched (5, 4, 3...)
  bonusMatch: { type: Boolean, default: false }, // bonus number matched?
  prizePercent: { type: Number, default: 0 }, // percentage of pool (e.g., 50 for jackpot)
  fixedPrize: { type: Number, default: 0 }, // or fixed amount
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
    maxNumber: { type: Number, default: 50 }, // max number for main numbers (1-50)
    maxBonus: { type: Number, default: 10 }, // max bonus number (1-10)
    numbersPerTicket: { type: Number, default: 5 },
    prizeTiers: [prizeTierSchema],
    winningNumbers: { type: [Number], default: [] }, // [main numbers]
    winningBonus: { type: Number, default: 0 },
    jackpot: { type: Number, default: 0 },
    totalTickets: { type: Number, default: 0 },
    totalPrizePool: { type: Number, default: 0 },
    rolloverCount: { type: Number, default: 0 },
    previousJackpot: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Auto-set status based on date
lotterySchema.pre("save", function (next) {
  const now = new Date();
  if (this.drawDate < now && this.status === "upcoming") {
    this.status = "active";
  }
  next();
});

module.exports = mongoose.model("lottery", lotterySchema);
