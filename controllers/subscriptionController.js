const Plan = require("../models/Plan");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { success, ApiError } = require("../helpers/responseHelper");

exports.listPlans = async (req, res, next) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ order: 1 });
    success(res, { items: plans });
  } catch (err) {
    next(err);
  }
};

exports.mySubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const plan = await Plan.findOne({ code: user.subscription.plan });

    const history = await Payment.find({ user: user._id, status: "paid" })
      .sort({ createdAt: -1 })
      .limit(10);

    success(res, {
      subscription: user.subscription,
      plan,
      isPremium: user.hasPremium(),
      isAdFree: user.isAdFree(),
      adFreeUntil: user.adFreeUntil,
      history,
    });
  } catch (err) {
    next(err);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.subscription.plan === "free") {
      throw new ApiError("You are already on the free plan", 400);
    }
    user.subscription.cancelledAt = new Date();
    await user.save();
    success(
      res,
      { subscription: user.subscription },
      "Subscription will end at expiry",
    );
  } catch (err) {
    next(err);
  }
};
