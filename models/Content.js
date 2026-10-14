const mongoose = require("mongoose");

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

    poster: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    backdrop: { url: String, publicId: String },
    trailer: { url: String, publicId: String },

    // For movies only. Series/anime use Episode model.
    video: {
      url: String,
      publicId: String,
      duration: Number,
      hls: String, // Cloudinary HLS stream URL
    },

    // Access control
    isPremium: { type: Boolean, default: false }, // premium = paid plans only
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },

    totalSeasons: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

contentSchema.index({ title: "text", description: "text" });

// Auto-slug
contentSchema.pre("save", function () {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
});

module.exports = mongoose.model("Content", contentSchema);
