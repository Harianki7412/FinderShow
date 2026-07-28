const mongoose = require("mongoose");

const lotteryTicketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lottery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lottery",
      required: true,
    },
    number: { type: Number, required: true }, // 1-100
    isWinner: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("lotteryTicket", lotteryTicketSchema);
