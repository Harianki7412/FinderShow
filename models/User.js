const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    avatar: { type: String, default: "" },

    subscription: {
      plan: {
        type: String,
        enum: ["free", "platinum", "gold"],
        default: "free",
      },
      planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan" },
      startedAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// ✅ Mongoose 8/9 style — no `next` argument
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.hasPremium = function () {
  if (!this.subscription) return false;
  if (this.subscription.plan === "free") return false;
  if (!this.subscription.expiresAt) return false;
  return new Date() < new Date(this.subscription.expiresAt);
};

module.exports = mongoose.model("User", userSchema);
