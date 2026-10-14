require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Plan = require("../models/Plan");

const PLANS = [
  {
    code: "free",
    name: "Free",
    price: 0,
    durationDays: 36500,
    order: 1,
    features: ["Ad-supported streaming", "SD quality (480p)", "1 screen"],
    ads: { enabled: true, adsPerHour: 2, adDurationSeconds: 30 },
    maxQuality: "480p",
    downloads: false,
    screens: 1,
  },
  {
    code: "platinum",
    name: "Platinum",
    price: 19,
    durationDays: 30,
    order: 2,
    features: [
      "Ad-free streaming",
      "HD quality (1080p)",
      "2 screens",
      "1 month access",
    ],
    ads: { enabled: false, adsPerHour: 0, adDurationSeconds: 0 },
    maxQuality: "1080p",
    downloads: true,
    screens: 2,
  },
  {
    code: "gold",
    name: "Gold",
    price: 49,
    durationDays: 90,
    order: 3,
    features: [
      "Ad-free streaming",
      "4K quality",
      "4 screens",
      "3 months access",
      "Downloads",
    ],
    ads: { enabled: false, adsPerHour: 0, adDurationSeconds: 0 },
    maxQuality: "4k",
    downloads: true,
    screens: 4,
  },
];

(async () => {
  try {
    await connectDB();
    for (const p of PLANS) {
      await Plan.findOneAndUpdate({ code: p.code }, p, {
        upsert: true,
        new: true,
      });
      console.log(`✅ Plan seeded: ${p.name} (₹${p.price})`);
    }
    console.log("🎉 All plans seeded");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
})();
