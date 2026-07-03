const mongoose = require("mongoose");

const spinSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coins: {
      type: Number, // ✅ Amount won – stored as a number
      required: true,
      min: 1,
    },
    segmentIndex: {
      type: Number,
      required: true,
    },
    // Track daily spins using date
    spinDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true },
);

// Indexes for faster queries
spinSchema.index({ user: 1, spinDate: -1 });
spinSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Spin", spinSchema);
