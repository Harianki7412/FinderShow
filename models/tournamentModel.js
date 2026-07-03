const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        score: { type: Number, default: 0 },
        gamesPlayed: { type: Number, default: 0 },
      },
    ],
    maxParticipants: { type: Number, default: 50 },
  },
  { timestamps: true },
);

tournamentSchema.index({ startDate: 1, endDate: 1 });
tournamentSchema.index({ status: 1 });

module.exports = mongoose.model("Tournament", tournamentSchema);
