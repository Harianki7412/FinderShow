const crypto = require("crypto");
const Razorpay = require("razorpay");
const Plan = require("../models/Plan");
const User = require("../models/User");
const Payment = require("../models/Payment");
const { success, ApiError } = require("../helpers/responseHelper");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res, next) => {
  try {
    const { planCode } = req.body;
    if (!["platinum", "gold"].includes(planCode)) {
      throw new ApiError("Invalid plan code", 400);
    }

    const plan = await Plan.findOne({ code: planCode, isActive: true });
    if (!plan) throw new ApiError("Plan not found", 404);

    const amountPaise = Math.round(plan.price * 100);
    const receipt = `zcoin_${planCode}_${req.user._id}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: { userId: req.user._id.toString(), planCode },
    });

    await Payment.create({
      user: req.user._id,
      plan: planCode,
      planId: plan._id,
      amount: plan.price,
      currency: "INR",
      provider: "razorpay",
      providerOrderId: order.id,
      receipt,
      status: "created",
    });

    success(
      res,
      {
        orderId: order.id,
        amount: plan.price,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        plan: {
          code: plan.code,
          name: plan.name,
          durationDays: plan.durationDays,
        },
      },
      "Order created",
    );
  } catch (err) {
    next(err);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new ApiError("Missing payment verification fields", 400);
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      throw new ApiError("Invalid signature", 400);
    }

    const payment = await Payment.findOne({
      providerOrderId: razorpay_order_id,
    });
    if (!payment) throw new ApiError("Payment record not found", 404);
    if (payment.status === "paid") {
      return success(res, { message: "Payment already verified" });
    }

    const plan = await Plan.findById(payment.planId);
    if (!plan) throw new ApiError("Plan not found", 404);

    const start = new Date();
    const end = new Date(
      start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000,
    );

    payment.status = "paid";
    payment.providerPaymentId = razorpay_payment_id;
    payment.providerSignature = razorpay_signature;
    payment.subscriptionStart = start;
    payment.subscriptionEnd = end;
    await payment.save();

    const user = await User.findById(payment.user);
    const currentExpiry = user.subscription?.expiresAt;
    const shouldExtend =
      user.hasPremium() && currentExpiry && new Date(currentExpiry) > start;

    const finalStart = shouldExtend ? user.subscription.startedAt : start;
    const finalEnd = shouldExtend
      ? new Date(
          new Date(currentExpiry).getTime() +
            plan.durationDays * 24 * 60 * 60 * 1000,
        )
      : end;

    user.subscription = {
      plan: plan.code,
      planId: plan._id,
      startedAt: finalStart,
      expiresAt: finalEnd,
      isActive: true,
    };
    await user.save();

    success(res, {
      message: "Subscription activated",
      subscription: user.subscription,
      payment: {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.webhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature) {
      return res
        .status(400)
        .json({ success: false, message: "Missing signature" });
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(req.body);
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }

    const parsed = JSON.parse(req.body.toString());
    const event = parsed.event;
    const payload = parsed.payload?.payment?.entity;

    if (event === "payment.captured" && payload) {
      const payment = await Payment.findOne({
        providerOrderId: payload.order_id,
      });
      if (payment && payment.status !== "paid") {
        payment.status = "paid";
        payment.providerPaymentId = payload.id;
        await payment.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
