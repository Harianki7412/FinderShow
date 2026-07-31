const mongoose = require("mongoose");

const lotteryTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lottery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lottery",
      required: true,
    },
    numbers: { type: [Number], required: true },
    bonusNumber: { type: Number, required: true },
    matchedCount: { type: Number, default: 0 },
    bonusMatched: { type: Boolean, default: false },
    prizeWon: { type: Number, default: 0 },
    prizeTier: { type: String, default: "" },
    isWinner: { type: Boolean, default: false },
  },
  { timestamps: true },
);

lotteryTicketSchema.pre("save", function (next) {
  if (this.numbers && this.numbers.length) {
    this.numbers.sort((a, b) => a - b);
  }
  next();
});

module.exports = mongoose.model("lotteryTicket", lotteryTicketSchema);
