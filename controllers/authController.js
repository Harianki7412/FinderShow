const User = require("../models/User");
const Plan = require("../models/Plan");
const { signToken } = require("../helpers/jwtHelper");
const { success, ApiError } = require("../helpers/responseHelper");

const buildAuthPayload = (user) => ({
  token: signToken(user._id),
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    subscription: user.subscription,
    adFreeUntil: user.adFreeUntil,
  },
});

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      throw new ApiError("All fields are required", 400);
    }

    const exists = await User.findOne({ email });
    if (exists) throw new ApiError("Email already registered", 409);

    const freePlan = await Plan.findOne({ code: "free" });

    const user = await User.create({
      name,
      email,
      password,
      role: role === "admin" ? "admin" : "user",
      subscription: {
        plan: "free",
        planId: freePlan?._id,
        isActive: true,
      },
    });

    success(res, buildAuthPayload(user), "Registered successfully", 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.matchPassword(password))) {
      throw new ApiError("Invalid email or password", 401);
    }

    // Auto-expire paid plans
    if (
      user.subscription?.plan !== "free" &&
      user.subscription?.expiresAt &&
      new Date() > new Date(user.subscription.expiresAt)
    ) {
      const freePlan = await Plan.findOne({ code: "free" });
      user.subscription = {
        plan: "free",
        planId: freePlan?._id,
        isActive: true,
      };
      await user.save();
    }

    success(res, buildAuthPayload(user), "Logged in");
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res) => success(res, { user: req.user });

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { ...(name && { name }), ...(avatar && { avatar }) } },
      { new: true },
    );
    success(res, { user }, "Profile updated");
  } catch (err) {
    next(err);
  }
};
