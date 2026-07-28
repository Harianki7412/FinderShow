const lotteryModel = require("../models/lotteryModel");
const lotteryTicketModel = require("../models/lotteryTicketModel");
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;

// ─── Get current or next lottery ──────────────────────────────
const getCurrentLottery = async (req, res) => {
  try {
    let lottery = await lotteryModel
      .findOne({ status: { $in: ["active", "upcoming"] } })
      .sort({ drawDate: 1 });
    if (!lottery) {
      const drawDate = new Date();
      drawDate.setHours(20, 0, 0, 0);
      if (drawDate < new Date()) drawDate.setDate(drawDate.getDate() + 1);
      lottery = new lotteryModel({ drawDate });
      await lottery.save();
    }
    const tickets = await lotteryTicketModel.find({
      lottery: lottery._id,
      user: req.user._id,
    });
    const ticketNumbers = tickets.map((t) => t.number);
    res.status(200).json({
      success: true,
      lottery: {
        ...lottery._doc,
        tickets: ticketNumbers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Buy a ticket ──────────────────────────────────────────────
const buyTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lotteryId } = req.body;

    if (!ObjectId.isValid(lotteryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lottery ID" });
    }

    const lottery = await lotteryModel.findById(lotteryId).session(session);
    if (!lottery) {
      return res
        .status(404)
        .json({ success: false, message: "Lottery not found" });
    }

    if (lottery.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This lottery has already been completed",
      });
    }

    if (lottery.drawDate < new Date()) {
      return res.status(400).json({
        success: false,
        message:
          "The lottery draw date has passed; no more tickets can be bought",
      });
    }

    if (!["active", "upcoming"].includes(lottery.status)) {
      return res.status(400).json({
        success: false,
        message: "Lottery is not open for ticket purchases",
      });
    }

    const user = await userModel.findById(req.user._id).session(session);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.coins < lottery.ticketPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });
    }

    let number;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 50) {
      number = Math.floor(Math.random() * 100) + 1;
      const existing = await lotteryTicketModel
        .findOne({ lottery: lottery._id, number })
        .session(session);
      if (!existing) isUnique = true;
      attempts++;
    }
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        message: "Could not generate a unique number. Try again.",
      });
    }

    user.coins -= lottery.ticketPrice;
    await user.save({ session });

    const ticket = new lotteryTicketModel({
      user: user._id,
      lottery: lottery._id,
      number,
    });
    await ticket.save({ session });

    lottery.prizePool += lottery.ticketPrice;
    lottery.totalTickets += 1;
    await lottery.save({ session });

    const transaction = new transactionModel({
      from: user._id,
      to: null,
      amount: lottery.ticketPrice,
      type: "debit",
      description: `Lottery ticket (${number}) for draw on ${lottery.drawDate.toLocaleDateString()}`,
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: "Ticket purchased!",
      ticket: { number, ticketId: ticket._id },
      newBalance: user.coins,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get lottery history ──────────────────────────────────────
const getLotteryHistory = async (req, res) => {
  try {
    const history = await lotteryModel
      .find({ status: "completed" })
      .sort({ drawDate: -1 })
      .populate("winner", "name email");
    res.status(200).json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── (Admin) Trigger draw ──────────────────────────────────────
const drawWinner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lotteryId } = req.body;

    if (!ObjectId.isValid(lotteryId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lottery ID" });
    }

    const lottery = await lotteryModel.findById(lotteryId).session(session);
    if (!lottery) {
      return res
        .status(404)
        .json({ success: false, message: "Lottery not found" });
    }
    if (lottery.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "This lottery is already completed",
      });
    }
    if (lottery.totalTickets === 0) {
      return res.status(400).json({
        success: false,
        message: "No tickets sold – cannot draw",
      });
    }

    const winningNumber = Math.floor(Math.random() * 100) + 1;

    const tickets = await lotteryTicketModel
      .find({ lottery: lottery._id })
      .session(session);

    if (tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No tickets found",
      });
    }

    let closestTicket = tickets[0];
    let minDiff = Math.abs(closestTicket.number - winningNumber);
    let candidates = [closestTicket];

    for (let i = 1; i < tickets.length; i++) {
      const ticket = tickets[i];
      const diff = Math.abs(ticket.number - winningNumber);
      if (diff < minDiff) {
        minDiff = diff;
        candidates = [ticket];
      } else if (diff === minDiff) {
        candidates.push(ticket);
      }
    }

    const winnerTicket =
      candidates[Math.floor(Math.random() * candidates.length)];
    winnerTicket.isWinner = true;
    await winnerTicket.save({ session });

    const prize = Math.floor(lottery.prizePool * 0.8);
    const winnerUser = await userModel
      .findById(winnerTicket.user)
      .session(session);

    if (winnerUser) {
      winnerUser.coins += prize;
      await winnerUser.save({ session });

      const transaction = new transactionModel({
        from: null,
        to: winnerUser._id,
        amount: prize,
        type: "credit",
        description: `Lottery win (draw ${lottery.drawDate.toLocaleDateString()})`,
      });
      await transaction.save({ session });
    }

    lottery.status = "completed";
    lottery.winningNumber = winningNumber;
    lottery.winner = winnerTicket.user;
    lottery.winnerPrize = prize;
    await lottery.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Draw completed!",
      winningNumber,
      winner: winnerUser ? winnerUser.name : "Unknown",
      prize,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ EXPORT ALL FUNCTIONS
module.exports = {
  getCurrentLottery,
  buyTicket,
  getLotteryHistory,
  drawWinner,
};
