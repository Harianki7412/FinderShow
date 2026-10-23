const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    slug: String,
    embedUrl: String,
    name: String,
    size: Number,
    status: String,
    resolutions: [String],
  },
  { _id: false },
);

const adSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    advertiser: String,
    video: videoSchema,
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
