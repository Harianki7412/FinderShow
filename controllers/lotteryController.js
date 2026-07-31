const lotteryModel = require("../models/lotteryModel");
const lotteryTicketModel = require("../models/lotteryTicketModel");
const userModel = require("../models/userModel");
const transactionModel = require("../models/transactionModel");
const mongoose = require("mongoose");

const DEFAULT_PRIZE_TIERS = [
  { name: "Jackpot", matchCount: 5, bonusMatch: true, prizePercent: 50 },
  { name: "2nd Prize", matchCount: 5, bonusMatch: false, prizePercent: 20 },
  { name: "3rd Prize", matchCount: 4, bonusMatch: false, prizePercent: 15 },
  { name: "4th Prize", matchCount: 3, bonusMatch: false, prizePercent: 10 },
  { name: "Consolation", matchCount: 2, bonusMatch: false, fixedPrize: 5 },
];

// ────── User Endpoints ──────

exports.getActiveLotteries = async (req, res) => {
  try {
    const lotteries = await lotteryModel
      .find({
        status: { $in: ["upcoming", "active"] },
      })
      .sort({ drawDate: 1 });

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

exports.getLotteryDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const lottery = await lotteryModel.findById(id);
    if (!lottery)
      return res.status(404).json({ success: false, message: "Not found" });
    const tickets = await lotteryTicketModel.find({
      lottery: id,
      user: req.user._id,
    });
    res.status(200).json({
      success: true,
      lottery: { ...lottery._doc, userTickets: tickets },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.buyTicket = async (req, res) => {
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
    if (user.coins < lottery.ticketPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Insufficient coins" });
    }
    if (!numbers || numbers.length !== lottery.numbersPerTicket) {
      return res.status(400).json({
        success: false,
        message: `Select ${lottery.numbersPerTicket} numbers`,
      });
    }
    if (!bonusNumber || bonusNumber < 1 || bonusNumber > lottery.maxBonus) {
      return res.status(400).json({
        success: false,
        message: `Select bonus 1-${lottery.maxBonus}`,
      });
    }
    if (new Set(numbers).size !== numbers.length) {
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

    // Transaction record
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

exports.getMyTickets = async (req, res) => {
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

// ────── Admin Endpoints ──────

exports.createLottery = async (req, res) => {
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

exports.drawWinner = async (req, res) => {
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
    const available = Array.from(
      { length: lottery.maxNumber },
      (_, i) => i + 1,
    );
    const winningNumbers = [];
    for (let i = 0; i < lottery.numbersPerTicket; i++) {
      const idx = Math.floor(Math.random() * available.length);
      winningNumbers.push(available[idx]);
      available.splice(idx, 1);
    }
    const winningBonus = Math.floor(Math.random() * lottery.maxBonus) + 1;

    // Find all tickets and calculate matches
    const tickets = await lotteryTicketModel
      .find({ lottery: lottery._id })
      .session(session);
    const ticketWinners = []; // { ticket, tier }

    for (const ticket of tickets) {
      let matched = ticket.numbers.filter((n) =>
        winningNumbers.includes(n),
      ).length;
      const bonusMatched = ticket.bonusNumber === winningBonus;
      ticket.matchedCount = matched;
      ticket.bonusMatched = bonusMatched;

      // Find prize tier
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
        ticket.isWinner = true;
        ticket.prizeTier = prizeTier.name;
        ticketWinners.push({ ticket, tier: prizeTier });
      }
      await ticket.save({ session });
    }

    // Group winners by tier name
    const tierGroups = {};
    for (const w of ticketWinners) {
      const tierName = w.tier.name;
      if (!tierGroups[tierName]) tierGroups[tierName] = [];
      tierGroups[tierName].push(w);
    }

    // Award prizes per tier (split among winners)
    for (const [tierName, winners] of Object.entries(tierGroups)) {
      const tier = winners[0].tier;
      let tierPrize = 0;
      if (tierName === "Jackpot") {
        tierPrize = lottery.jackpot;
      } else if (tier.prizePercent > 0) {
        tierPrize = Math.floor(
          lottery.totalPrizePool * (tier.prizePercent / 100),
        );
      } else if (tier.fixedPrize > 0) {
        tierPrize = tier.fixedPrize * winners.length;
      }

      const prizePerWinner =
        winners.length > 0 ? Math.floor(tierPrize / winners.length) : 0;

      for (const w of winners) {
        w.ticket.prizeWon = prizePerWinner;
        await w.ticket.save({ session });
        if (prizePerWinner > 0) {
          const user = await userModel.findById(w.ticket.user).session(session);
          if (user) {
            user.coins += prizePerWinner;
            await user.save({ session });
            await new transactionModel({
              from: null,
              to: user._id,
              amount: prizePerWinner,
              type: "credit",
              description: `Lottery win (${lottery.name}) - ${tierName}`,
            }).save({ session });
          }
        }
      }
    }

    // Update lottery status
    lottery.status = "completed";
    lottery.winningNumbers = winningNumbers;
    lottery.winningBonus = winningBonus;

    // Check if Jackpot was won
    const jackpotWinners = ticketWinners.filter(
      (w) => w.tier.name === "Jackpot",
    );
    if (jackpotWinners.length === 0) {
      // Rollover jackpot to next lottery
      lottery.rolloverCount += 1;
      lottery.previousJackpot = lottery.jackpot;
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
      lottery.jackpot = 0;
    } else {
      lottery.jackpot = 0;
    }
    await lottery.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      winningNumbers,
      winningBonus,
      winners: ticketWinners.map((w) => ({
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

exports.getAllLotteries = async (req, res) => {
  try {
    const lotteries = await lotteryModel.find().sort({ drawDate: -1 });
    res.status(200).json({ success: true, lotteries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLotteryStats = async (req, res) => {
  try {
    const totalLotteries = await lotteryModel.countDocuments();
    const totalTickets = await lotteryTicketModel.countDocuments();
    const totalWinners = await lotteryTicketModel.countDocuments({
      isWinner: true,
    });
    const totalPrizes = await lotteryTicketModel.aggregate([
      { $group: { _id: null, total: { $sum: "$prizeWon" } } },
    ]);
    res.status(200).json({
      success: true,
      stats: {
        totalLotteries,
        totalTickets,
        totalWinners,
        totalPrizes: totalPrizes[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
