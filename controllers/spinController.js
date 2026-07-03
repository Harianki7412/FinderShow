const mongoose = require("mongoose");
const userModel = require("../models/userModel");
const spinModel = require("../models/spinModel");
const transactionModel = require("../models/transactionModel");

const wheelSegments = [
  { coins: 10, label: "10" },
  { coins: 50, label: "50" },
  { coins: 100, label: "100" },
  { coins: 25, label: "25" },
  { coins: 75, label: "75" },
  { coins: 200, label: "200" },
  { coins: 5, label: "5" },
  { coins: 150, label: "150" },
];

const getSpinsLeft = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySpins = await spinModel.countDocuments({
      user: userId,
      spinDate: { $gte: today, $lt: tomorrow },
    });

    const spinsLeft = Math.max(0, 3 - todaySpins);
    res.status(200).json({ success: true, spinsLeft });
  } catch (error) {
    console.error("getSpinsLeft error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSpinHistory = async (req, res) => {
  try {
    const history = await spinModel
      .find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error("getSpinHistory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const performSpin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySpins = await spinModel
      .countDocuments({
        user: userId,
        spinDate: { $gte: today, $lt: tomorrow },
      })
      .session(session);

    if (todaySpins >= 3) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json({ success: false, message: "No spins left today" });
    }

    const segmentIndex = Math.floor(Math.random() * wheelSegments.length);
    const wonCoins = wheelSegments[segmentIndex].coins;

    const user = await userModel.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // ✅ Add coins to user balance
    user.coins += wonCoins;
    await user.save({ session });

    // ✅ Create spin record – coins is a Number
    const spin = new spinModel({
      user: userId,
      coins: wonCoins,
      segmentIndex,
      spinDate: today,
    });
    await spin.save({ session });

    // ✅ Record transaction
    const transaction = new transactionModel({
      from: null,
      to: user._id,
      amount: wonCoins,
      type: "credit",
      description: "Spin wheel win",
    });
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    const remainingSpins = Math.max(0, 3 - (todaySpins + 1));

    res.status(200).json({
      success: true,
      wonCoins,
      remainingSpins,
      segmentIndex,
      newBalance: user.coins,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("performSpin error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSpinsLeft, getSpinHistory, performSpin };
