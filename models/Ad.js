const mongoose = require("mongoose");

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    advertiser: String,

    video: {
      uid: { type: String, required: true },
      hlsUrl: { type: String, required: true },
      duration: { type: Number, default: 30 },
      thumbnail: String,
      status: String,
      readyToStream: { type: Boolean, default: false },
    },

    clickUrl: String,
    skipAfterSeconds: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    targetPlans: [
      {
        type: String,
        enum: ["free", "platinum", "gold"],
        default: ["free"],
      },
    ],
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ad", adSchema);
