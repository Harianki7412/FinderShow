const lotteryModel = require("../models/lotteryModel");
const lotteryTicketModel = require("../models/lotteryTicketModel");
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const mongoose = require("mongoose");

// ─── Constants ──────────────────────────────────────────────
const DEFAULT_PRIZE_TIERS = [
  { name: "Jackpot", matchCount: 5, bonusMatch: true, prizePercent: 50 },
  { name: "2nd Prize", matchCount: 5, bonusMatch: false, prizePercent: 20 },
  { name: "3rd Prize", matchCount: 4, bonusMatch: false, prizePercent: 15 },
  { name: "4th Prize", matchCount: 3, bonusMatch: false, prizePercent: 10 },
  { name: "Consolation", matchCount: 2, bonusMatch: false, fixedPrize: 5 },
];

// ─── Get active/upcoming lotteries ──────────────────────────
const getActiveLotteries = async (req, res) => {
  try {
    const lotteries = await lotteryModel
      .find({
        status: { $in: ["upcoming", "active"] },
      })
      .sort({ drawDate: 1 });
    // Get user tickets for each lottery
    const result = await Promise.all(
      lotteries.map(async (lottery) => {
        const tickets = await lotteryTicketModel.find({
          lottery: lottery._id,
          user: req.user._id,
        });
        return {
          ...lottery._doc,
          userTickets: tickets.map((t) => ({
            numbers: t.numbers,
            bonusNumber: t.bonusNumber,
            isWinner: t.isWinner,
            prizeWon: t.prizeWon,
          })),
          ticketCount: tickets.length,
        };
      }),
    );
    res.status(200).json({ success: true, lotteries: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get single lottery details ──────────────────────────────
const getLotteryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const lottery = await lotteryModel.findById(id);
    if (!lottery)
      return res
        .status(404)
        .json({ success: false, message: "Lottery not found" });
    const tickets = await lotteryTicketModel.find({
      lottery: lottery._id,
      user: req.user._id,
    });
    res.status(200).json({
      success: true,
      lottery: {
        ...lottery._doc,
        userTickets: tickets,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Buy ticket ──────────────────────────────────────────────
const buyTicket = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lotteryId, numbers, bonusNumber } = req.body;
    const lottery = await lotteryModel.findById(lotteryId).session(session);
    if (!lottery)
      return res
        .status(404)
        .json({ success: false, message: "Lottery not found" });
    if (lottery.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Lottery already completed" });
    }
    const user = await userModel.findById(req.user._id).session(session);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.coins < lottery.ticketPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });
    }
    // Validate numbers
    if (!numbers || numbers.length !== lottery.numbersPerTicket) {
      return res.status(400).json({
        success: false,
        message: `Please select ${lottery.numbersPerTicket} numbers`,
      });
    }
    if (
      bonusNumber === undefined ||
      bonusNumber < 1 ||
      bonusNumber > lottery.maxBonus
    ) {
      return res.status(400).json({
        success: false,
        message: `Please select a bonus number between 1 and ${lottery.maxBonus}`,
      });
    }
    // Check for duplicates in numbers
    const uniqueNumbers = new Set(numbers);
    if (uniqueNumbers.size !== numbers.length) {
      return res
        .status(400)
        .json({ success: false, message: "Numbers must be unique" });
    }
    // Deduct coins
    user.coins -= lottery.ticketPrice;
    await user.save({ session });
    // Create ticket
    const ticket = new lotteryTicketModel({
      user: user._id,
      lottery: lottery._id,
      numbers: numbers.sort((a, b) => a - b),
      bonusNumber,
    });
    await ticket.save({ session });
    // Update lottery
    lottery.totalTickets += 1;
    lottery.totalPrizePool += lottery.ticketPrice;
    lottery.jackpot += lottery.ticketPrice * 0.5; // 50% to jackpot
    await lottery.save({ session });
    // Record transaction
    const transaction = new transactionModel({
      from: user._id,
      to: null,
      amount: lottery.ticketPrice,
      type: "debit",
      description: `Lottery ticket (${lottery.name})`,
    });
    await transaction.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(201).json({
      success: true,
      message: "Ticket purchased!",
      ticket: {
        numbers: ticket.numbers,
        bonusNumber: ticket.bonusNumber,
        ticketId: ticket._id,
      },
      newBalance: user.coins,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get user's ticket history ──────────────────────────────
const getMyTickets = async (req, res) => {
  try {
    const tickets = await lotteryTicketModel
      .find({ user: req.user._id })
      .populate(
        "lottery",
        "name drawDate status winningNumbers winningBonus jackpot",
      )
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── (Admin) Create lottery ──────────────────────────────────
const createLottery = async (req, res) => {
  try {
    const {
      name,
      type,
      drawDate,
      ticketPrice,
      prizeTiers,
      maxNumber,
      maxBonus,
      numbersPerTicket,
    } = req.body;
    const lottery = new lotteryModel({
      name,
      type: type || "daily",
      drawDate: new Date(drawDate),
      ticketPrice: ticketPrice || 10,
      maxNumber: maxNumber || 50,
      maxBonus: maxBonus || 10,
      numbersPerTicket: numbersPerTicket || 5,
      prizeTiers: prizeTiers || DEFAULT_PRIZE_TIERS,
      jackpot: 0,
    });
    await lottery.save();
    res.status(201).json({ success: true, lottery });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── (Admin) Trigger draw ────────────────────────────────────
const drawWinner = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lotteryId } = req.body;
    const lottery = await lotteryModel.findById(lotteryId).session(session);
    if (!lottery)
      return res
        .status(404)
        .json({ success: false, message: "Lottery not found" });
    if (lottery.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Already completed" });
    }
    if (lottery.totalTickets === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No tickets sold" });
    }
    // Generate winning numbers
    const winningNumbers = [];
    const available = Array.from(
      { length: lottery.maxNumber },
      (_, i) => i + 1,
    );
    for (let i = 0; i < lottery.numbersPerTicket; i++) {
      const idx = Math.floor(Math.random() * available.length);
      winningNumbers.push(available[idx]);
      available.splice(idx, 1);
    }
    const winningBonus = Math.floor(Math.random() * lottery.maxBonus) + 1;
    // Find tickets
    const tickets = await lotteryTicketModel
      .find({ lottery: lottery._id })
      .session(session);
    const winners = [];
    // Calculate matches
    for (const ticket of tickets) {
      let matched = 0;
      for (const num of ticket.numbers) {
        if (winningNumbers.includes(num)) matched++;
      }
      const bonusMatched = ticket.bonusNumber === winningBonus;
      ticket.matchedCount = matched;
      ticket.bonusMatched = bonusMatched;
      // Determine prize tier
      let prizeTier = null;
      for (const tier of lottery.prizeTiers) {
        if (tier.bonusMatch && matched === tier.matchCount && bonusMatched) {
          prizeTier = tier;
          break;
        }
        if (!tier.bonusMatch && matched === tier.matchCount) {
          prizeTier = tier;
          break;
        }
      }
      if (prizeTier) {
        let prize = 0;
        if (prizeTier.prizePercent > 0) {
          prize = Math.floor(
            lottery.totalPrizePool * (prizeTier.prizePercent / 100),
          );
        } else if (prizeTier.fixedPrize > 0) {
          prize = prizeTier.fixedPrize;
        }
        if (prize > 0) {
          ticket.isWinner = true;
          ticket.prizeWon = prize;
          ticket.prizeTier = prizeTier.name;
          winners.push({ ticket, prize });
        }
      }
      await ticket.save({ session });
    }
    // Award prizes
    const jackpotWinners = winners.filter(
      (w) => w.ticket.prizeTier === "Jackpot",
    );
    if (jackpotWinners.length > 0) {
      // Jackpot winners split the jackpot
      const jackpotPrize = lottery.jackpot;
      const share = Math.floor(jackpotPrize / jackpotWinners.length);
      for (const winner of jackpotWinners) {
        winner.ticket.prizeWon = share;
        await winner.ticket.save({ session });
        const user = await userModel
          .findById(winner.ticket.user)
          .session(session);
        if (user) {
          user.coins += share;
          await user.save({ session });
          const transaction = new transactionModel({
            from: null,
            to: user._id,
            amount: share,
            type: "credit",
            description: `Lottery win (${lottery.name}) - Jackpot`,
          });
          await transaction.save({ session });
        }
      }
    } else {
      // No jackpot winner – rollover
      lottery.rolloverCount += 1;
      lottery.previousJackpot = lottery.jackpot;
    }
    // Also award non‑jackpot winners
    for (const winner of winners) {
      if (winner.ticket.prizeTier !== "Jackpot") {
        const user = await userModel
          .findById(winner.ticket.user)
          .session(session);
        if (user) {
          user.coins += winner.ticket.prizeWon;
          await user.save({ session });
          const transaction = new transactionModel({
            from: null,
            to: user._id,
            amount: winner.ticket.prizeWon,
            type: "credit",
            description: `Lottery win (${lottery.name}) - ${winner.ticket.prizeTier}`,
          });
          await transaction.save({ session });
        }
      }
    }
    // Update lottery
    lottery.status = "completed";
    lottery.winningNumbers = winningNumbers;
    lottery.winningBonus = winningBonus;
    if (jackpotWinners.length === 0) {
      // Rollover jackpot to next lottery (if any)
      const nextLottery = await lotteryModel
        .findOne({
          status: { $in: ["upcoming", "active"] },
          _id: { $ne: lottery._id },
        })
        .session(session);
      if (nextLottery) {
        nextLottery.jackpot += lottery.jackpot;
        await nextLottery.save({ session });
      }
      lottery.jackpot = 0; // reset current
    }
    await lottery.save({ session });
    await session.commitTransaction();
    session.endSession();
    res.status(200).json({
      success: true,
      winningNumbers,
      winningBonus,
      winners: winners.map((w) => ({
        user: w.ticket.user,
        numbers: w.ticket.numbers,
        prize: w.ticket.prizeWon,
        tier: w.ticket.prizeTier,
      })),
      jackpot: lottery.jackpot,
      rollover: lottery.rolloverCount,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── (Admin) Get all lotteries ──────────────────────────────
const getAllLotteries = async (req, res) => {
  try {
    const lotteries = await lotteryModel.find().sort({ drawDate: -1 });
    res.status(200).json({ success: true, lotteries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── (Admin) Get stats ──────────────────────────────────────
const getLotteryStats = async (req, res) => {
  try {
    const totalLotteries = await lotteryModel.countDocuments();
    const totalTickets = await lotteryTicketModel.countDocuments();
    const totalWinners = await lotteryTicketModel.countDocuments({
      isWinner: true,
    });
    const totalPrizes = await lotteryTicketModel.aggregate([
      { $group: { _id: null, total: { $sum: "$prizeWon" } } },
    ]);
    const stats = {
      totalLotteries,
      totalTickets,
      totalWinners,
      totalPrizes: totalPrizes[0]?.total || 0,
    };
    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getActiveLotteries,
  getLotteryDetails,
  buyTicket,
  getMyTickets,
  createLottery,
  drawWinner,
  getAllLotteries,
  getLotteryStats,
};
