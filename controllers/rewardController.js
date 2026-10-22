const User = require("../models/User");
const { success, ApiError } = require("../helpers/responseHelper");

exports.grantUnlock = async (req, res, next) => {
  try {
    const { minutes = 60 } = req.body;
    if (minutes < 1 || minutes > 24 * 60) {
      throw new ApiError("Invalid unlock duration", 400);
    }

    const user = await User.findById(req.user._id);
    const now = Date.now();
    const current = user.adFreeUntil ? new Date(user.adFreeUntil).getTime() : 0;
    const base = Math.max(now, current);

    user.adFreeUntil = new Date(base + minutes * 60 * 1000);
    user.adFreeReason = "rewarded";
    await user.save();

    success(
      res,
      { adFreeUntil: user.adFreeUntil, minutesAdded: minutes },
      `Ad-free for ${minutes} minutes`,
    );
  } catch (err) {
    next(err);
  }
};

exports.rewardStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    success(res, {
      isAdFree: user.isAdFree(),
      adFreeUntil: user.adFreeUntil,
      reason: user.adFreeReason,
      isPremium: user.hasPremium(),
    });
  } catch (err) {
    next(err);
  }
};
