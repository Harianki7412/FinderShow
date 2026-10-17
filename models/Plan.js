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
    price: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    durationDays: { type: Number, required: true },
    features: [{ type: String }],

    ads: {
      enabled: { type: Boolean, default: false },
      adsPerHour: { type: Number, default: 0 },
      adDurationSeconds: { type: Number, default: 30 },
    },

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
