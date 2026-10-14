const mongoose = require("mongoose");

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    advertiser: String,
    video: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      duration: { type: Number, default: 30 }, // seconds
    },
    clickUrl: String,
    skipAfterSeconds: { type: Number, default: 30 }, // 0 = unskippable
    isActive: { type: Boolean, default: true },
    // Targeting (optional)
    targetPlans: [
      { type: String, enum: ["free", "platinum", "gold"], default: ["free"] },
    ],
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ad", adSchema);
