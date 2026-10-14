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
    thumbnail: { url: String, publicId: String },

    video: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      duration: { type: Number, default: 0 },
      hls: String,
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
