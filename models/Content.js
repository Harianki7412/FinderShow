const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    id: String,
    url: String,
    thumbnail: String,
  },
  { _id: false },
);

const videoSchema = new mongoose.Schema(
  {
    uid: String,
    hlsUrl: String,
    thumbnail: String,
    duration: Number,
    status: String,
    readyToStream: Boolean,
    requireSignedURLs: Boolean,
  },
  { _id: false },
);

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["movie", "series", "anime"],
      required: true,
      index: true,
    },
    genres: [{ type: String, index: true }],
    releaseYear: Number,
    rating: { type: Number, min: 0, max: 10, default: 0 },
    language: { type: String, default: "English" },
    cast: [String],
    director: String,

    poster: imageSchema,
    backdrop: imageSchema,
    trailer: videoSchema,
    video: videoSchema, // movies only

    isPremium: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },

    totalSeasons: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

contentSchema.index({ title: "text", description: "text" });

contentSchema.pre("save", function () {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

module.exports = mongoose.model("Content", contentSchema);
