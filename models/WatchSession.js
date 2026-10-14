const mongoose = require("mongoose");

const adEventSchema = new mongoose.Schema(
  {
    ad: { type: mongoose.Schema.Types.ObjectId, ref: "Ad" },
    shownAt: { type: Date, default: Date.now },
    watchedSeconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    skipped: { type: Boolean, default: false },
  },
  { _id: false },
);

const watchSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: mongoose.Schema.Types.ObjectId, ref: "Content" },
    episode: { type: mongoose.Schema.Types.ObjectId, ref: "Episode" },

    // Ad scheduling
    lastAdShownAt: { type: Date, default: null },
    adsShownThisSession: { type: Number, default: 0 },
    adEvents: [adEventSchema],

    watchTimeSeconds: { type: Number, default: 0 },
    lastPositionSeconds: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("WatchSession", watchSessionSchema);
