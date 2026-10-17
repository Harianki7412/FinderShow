const Plan = require("../models/Plan");
const { fail } = require("../helpers/responseHelper");

const requirePremium = async (req, res, next) => {
  const user = req.user;
  if (!user) return fail(res, "Login required", 401);
  if (!user.hasPremium()) {
    return fail(res, "Premium subscription required", 403);
  }
  next();
};

const attachPlan = async (req, res, next) => {
  try {
    const planCode = req.user?.subscription?.plan || "free";
    const plan = await Plan.findOne({ code: planCode, isActive: true });
    req.plan = plan || (await Plan.findOne({ code: "free" }));
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requirePremium, attachPlan };
