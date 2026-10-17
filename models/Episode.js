const mongoose = require("mongoose");

const episodeSchema = new mongoose.Schema(
  {
    content: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
      index: true,
    },
    seasonNumber: { type: Number, required: true },
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },

    thumbnail: {
      id: String,
      url: String,
      cloudflareUid: String,
    },

    video: {
      uid: { type: String, required: true },
      hlsUrl: { type: String, required: true },
      thumbnail: String,
      duration: { type: Number, default: 0 },
      status: String,
      readyToStream: { type: Boolean, default: false },
    },

    isPremium: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: true },
    airDate: Date,
  },
  { timestamps: true },
);

episodeSchema.index(
  { content: 1, seasonNumber: 1, episodeNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model("Episode", episodeSchema);
