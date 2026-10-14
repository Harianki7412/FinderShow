const PLAN_CODES = { FREE: "free", PLATINUM: "platinum", GOLD: "gold" };

const AD_POLICY = {
  free: { adsPerHour: 2, adDurationSeconds: 30 },
  platinum: { adsPerHour: 0, adDurationSeconds: 0 },
  gold: { adsPerHour: 0, adDurationSeconds: 0 },
};

module.exports = { PLAN_CODES, AD_POLICY };
