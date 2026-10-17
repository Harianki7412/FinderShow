const mongoose = require('mongoose');

const rewardLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['admob-ssv', 'client-claim'],
      default: 'client-claim',
    },
    minutes: { type: Number, required: true },
    adUnitId: String,
    transactionId: String,         // AdMob unique transaction ID
    rawQuery: { type: Object },     // Full SSV payload for audit
    verified: { type: Boolean, default: false },
    ip: String,
    userAgent: String,
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

rewardLogSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('RewardLog', rewardLogSchema);