const WatchSession = require("../models/WatchSession");
const Content = require("../models/Content");
const Episode = require("../models/Episode");
const Ad = require("../models/Ad");
const Plan = require("../models/Plan");
const { getStreamInfo } = require("../helpers/abyssHelper");
const { success, ApiError } = require("../helpers/responseHelper");

const MINUTE_MS = 60 * 1000;

exports.startSession = async (req, res, next) => {
  try {
    const { contentId, episodeId } = req.body;
    const content = await Content.findById(contentId).lean();
    if (!content) throw new ApiError("Content not found", 404);

    const planCode = req.user.subscription?.plan || "free";
    const plan = await Plan.findOne({ code: planCode, isActive: true });
    const isPremiumUser = req.user.hasPremium();
    const isAdFree = req.user.isAdFree();

    if (content.isPremium && !isPremiumUser) {
      throw new ApiError(
        "This content requires a Platinum or Gold subscription",
        403,
      );
    }

    const adsEnabled = (plan?.ads?.enabled ?? true) && !isAdFree;
    const adsPerHour = plan?.ads?.adsPerHour ?? 2;
    const adDuration = plan?.ads?.adDurationSeconds ?? 30;
    const adIntervalMs =
      adsEnabled && adsPerHour > 0 ? (60 / adsPerHour) * MINUTE_MS : 0;

    // Resolve stream from Abyss
    let streamSlug;
    if (episodeId) {
      const ep = await Episode.findById(episodeId).lean();
      if (!ep) throw new ApiError("Episode not found", 404);
      streamSlug = ep.video?.slug;
    } else {
      streamSlug = content.video?.slug;
    }
    if (!streamSlug) throw new ApiError("Video not uploaded yet", 404);

    const stream = await getStreamInfo(streamSlug);

    // Watch session
    let session = await WatchSession.findOne({
      user: req.user._id,
      content: content._id,
      episode: episodeId || null,
      completed: false,
    });

    if (!session) {
      session = await WatchSession.create({
        user: req.user._id,
        content: content._id,
        episode: episodeId || null,
        lastAdShownAt: new Date(),
      });
    }

    success(
      res,
      {
        sessionId: session._id,
        stream,
        ads: {
          enabled: adsEnabled,
          perHour: adsPerHour,
          durationSeconds: adDuration,
          nextAdAfterSeconds: adIntervalMs / 1000,
          lastAdShownAt: session.lastAdShownAt,
          adFreeUntil: req.user.adFreeUntil,
        },
      },
      "Session started",
    );
  } catch (err) {
    next(err);
  }
};

exports.getScheduledAd = async (req, res, next) => {
  try {
    const session = await WatchSession.findById(req.params.sessionId);
    if (!session) throw new ApiError("Session not found", 404);
    if (session.user.toString() !== req.user._id.toString()) {
      throw new ApiError("Forbidden", 403);
    }

    const plan = await Plan.findOne({
      code: req.user.subscription?.plan || "free",
    });
    if (!plan?.ads?.enabled || req.user.isAdFree()) {
      return success(res, { ad: null, reason: "no-ads-for-plan" });
    }

    const adsPerHour = plan.ads.adsPerHour || 2;
    const intervalMs = (60 / adsPerHour) * MINUTE_MS;
    const elapsed = Date.now() - new Date(session.lastAdShownAt).getTime();

    if (elapsed < intervalMs) {
      return success(res, {
        ad: null,
        nextAdInSeconds: Math.ceil((intervalMs - elapsed) / 1000),
      });
    }

    const [ad] = await Ad.aggregate([
      { $match: { isActive: true, targetPlans: plan.code } },
      { $sample: { size: 1 } },
    ]);

    if (!ad) {
      session.lastAdShownAt = new Date();
      await session.save();
      return success(res, { ad: null, reason: "no-ad-inventory" });
    }

    session.lastAdShownAt = new Date();
    session.adsShownThisSession += 1;
    session.adEvents.push({ ad: ad._id, shownAt: new Date() });
    await session.save();

    Ad.findByIdAndUpdate(ad._id, { $inc: { impressions: 1 } }).exec();

    // Ad stream
    const adStream = await getStreamInfo(ad.video.slug);

    success(res, {
      ad: {
        _id: ad._id,
        title: ad.title,
        slug: ad.video.slug,
        embedUrl: adStream.embedUrl,
        directUrl: adStream.directUrl,
        duration: ad.video?.size ? 30 : 30,
        clickUrl: ad.clickUrl,
        skipAfterSeconds: ad.skipAfterSeconds,
      },
      nextAdInSeconds: intervalMs / 1000,
    });
  } catch (err) {
    next(err);
  }
};

exports.recordAdEvent = async (req, res, next) => {
  try {
    const { adId } = req.params;
    const { watchedSeconds = 0, completed = false, skipped = false } = req.body;

    const session = await WatchSession.findById(req.params.sessionId);
    if (!session) throw new ApiError("Session not found", 404);

    const event = session.adEvents
      .slice()
      .reverse()
      .find((e) => e.ad?.toString() === adId && !e.completed);

    if (event) {
      event.watchedSeconds = watchedSeconds;
      event.completed = completed;
      event.skipped = skipped;
      await session.save();
    }

    success(res, {}, "Ad event recorded");
  } catch (err) {
    next(err);
  }
};

exports.updateProgress = async (req, res, next) => {
  try {
    const { positionSeconds = 0 } = req.body;
    const session = await WatchSession.findById(req.params.sessionId);
    if (!session) throw new ApiError("Session not found", 404);

    session.lastPositionSeconds = positionSeconds;
    session.watchTimeSeconds += 5;
    await session.save();

    success(res, {}, "Progress saved");
  } catch (err) {
    next(err);
  }
};

exports.endSession = async (req, res, next) => {
  try {
    const { completed = false } = req.body;
    const session = await WatchSession.findById(req.params.sessionId);
    if (!session) throw new ApiError("Session not found", 404);

    session.completed = completed;
    await session.save();
    success(res, {}, "Session ended");
  } catch (err) {
    next(err);
  }
};
