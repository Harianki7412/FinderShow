const Ad = require("../models/Ad");
const { deleteVideo } = require("../helpers/cloudflareHelper");
const { success, ApiError } = require("../helpers/responseHelper");

// GET /ads/active
exports.getActiveAd = async (req, res, next) => {
  try {
    const planCode = req.user?.subscription?.plan || "free";

    const [ad] = await Ad.aggregate([
      { $match: { isActive: true, targetPlans: planCode } },
      { $sample: { size: 1 } },
    ]);

    if (!ad) return success(res, { ad: null }, "No ad available");

    Ad.findByIdAndUpdate(ad._id, { $inc: { impressions: 1 } }).exec();
    success(res, { ad });
  } catch (err) {
    next(err);
  }
};

// POST /ads/:id/click
exports.trackClick = async (req, res, next) => {
  try {
    await Ad.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } });
    success(res, {}, "Click tracked");
  } catch (err) {
    next(err);
  }
};

// Admin CRUD
exports.list = async (req, res, next) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    success(res, { items: ads });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const ad = await Ad.create(req.body);
    success(res, ad, "Ad created", 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!ad) throw new ApiError("Ad not found", 404);
    success(res, ad, "Ad updated");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const ad = await Ad.findById(req.params.id);
    if (!ad) throw new ApiError("Ad not found", 404);
    if (ad.video?.uid) await deleteVideo(ad.video.uid);
    await ad.deleteOne();
    success(res, {}, "Ad deleted");
  } catch (err) {
    next(err);
  }
};
