const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      enum: ["free", "platinum", "gold"],
      unique: true,
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // in INR
    currency: { type: String, default: "INR" },
    durationDays: { type: Number, required: true }, // 30 for platinum, 90 for gold
    features: [{ type: String }],

    // Ad behaviour
    ads: {
      enabled: { type: Boolean, default: false },
      adsPerHour: { type: Number, default: 0 }, // 2 for free
      adDurationSeconds: { type: Number, default: 30 },
    },

    // Content access
    maxQuality: {
      type: String,
      enum: ["480p", "720p", "1080p", "4k"],
      default: "720p",
    },
    downloads: { type: Boolean, default: false },
    screens: { type: Number, default: 1 },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
