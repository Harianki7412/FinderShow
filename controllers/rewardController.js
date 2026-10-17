const User = require("../models/User");
const { success, ApiError } = require("../helpers/responseHelper");

/**
 * POST /ads/reward/unlock
 * Called by the client after an AdMob rewarded ad earns a reward.
 * In production, verify SSV first (see admobSSV).
 */
exports.grantUnlock = async (req, res, next) => {
  try {
    const { minutes = 60 } = req.body;
    if (minutes < 1 || minutes > 24 * 60) {
      throw new ApiError("Invalid unlock duration", 400);
    }

    const user = await User.findById(req.user._id);
    const now = Date.now();
    const current = user.adFreeUntil ? new Date(user.adFreeUntil).getTime() : 0;
    const base = Math.max(now, current);

    user.adFreeUntil = new Date(base + minutes * 60 * 1000);
    user.adFreeReason = "rewarded";
    await user.save();

    success(
      res,
      {
        adFreeUntil: user.adFreeUntil,
        minutesAdded: minutes,
      },
      `Ad-free for ${minutes} minutes`,
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /ads/reward/status
 */
exports.rewardStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    success(res, {
      isAdFree: user.isAdFree(),
      adFreeUntil: user.adFreeUntil,
      reason: user.adFreeReason,
      isPremium: user.hasPremium(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /ads/reward/ssv — AdMob Server-Side Verification callback
 */
exports.admobSSV = async (req, res) => {
  try {
    const crypto = require("crypto");
    const https = require("https");

    const query = req.query;
    const { signature, key_id: keyId, custom_data: userId } = query;

    if (!signature || !keyId) {
      return res.status(400).send("Missing signature");
    }

    const keys = await new Promise((resolve, reject) => {
      https
        .get("https://gstatic.com/admob/reward/verifier-keys.json", (r) => {
          let data = "";
          r.on("data", (c) => (data += c));
          r.on("end", () => resolve(JSON.parse(data).keys));
        })
        .on("error", reject);
    });

    const key = keys.find((k) => k.keyId === Number(keyId));
    if (!key) return res.status(400).send("Unknown key");

    const url = req.originalUrl;
    const message = url.substring(1, url.lastIndexOf("&signature="));

    const verifier = crypto.createVerify("SHA256");
    verifier.update(message);

    const publicKey = `-----BEGIN PUBLIC KEY-----\n${key.pem}\n-----END PUBLIC KEY-----`;
    const valid = verifier.verify(publicKey, signature, "base64");

    if (!valid) return res.status(403).send("Invalid signature");

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const base = Math.max(
          Date.now(),
          user.adFreeUntil ? new Date(user.adFreeUntil).getTime() : 0,
        );
        user.adFreeUntil = new Date(base + 60 * 60 * 1000);
        user.adFreeReason = "rewarded";
        await user.save();
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("SSV error:", err);
    res.status(500).send("Error");
  }
};
