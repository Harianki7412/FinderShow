const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: { type: String, enum: ["platinum", "gold"], required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    provider: {
      type: String,
      enum: ["razorpay", "stripe", "manual"],
      default: "razorpay",
    },
    providerOrderId: String,
    providerPaymentId: String,
    providerSignature: String,

    status: {
      type: String,
      enum: ["created", "paid", "failed", "refunded"],
      default: "created",
      index: true,
    },

    subscriptionStart: Date,
    subscriptionEnd: Date,
    receipt: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
