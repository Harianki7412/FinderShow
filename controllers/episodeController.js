const Episode = require("../models/Episode");
const Content = require("../models/Content");
const { deleteVideo, deleteImage } = require("../helpers/cloudflareHelper");
const { success, ApiError } = require("../helpers/responseHelper");

exports.listByContent = async (req, res, next) => {
  try {
    const { season } = req.query;
    const filter = { content: req.params.contentId, isPublished: true };
    if (season) filter.seasonNumber = Number(season);

    const episodes = await Episode.find(filter)
      .sort({ seasonNumber: 1, episodeNumber: 1 })
      .lean();

    success(res, { items: episodes });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.contentId);
    if (!content) throw new ApiError("Content not found", 404);

    const episode = await Episode.create({
      ...req.body,
      content: content._id,
    });

    if (episode.seasonNumber > (content.totalSeasons || 0)) {
      content.totalSeasons = episode.seasonNumber;
      await content.save();
    }

    success(res, episode, "Episode created", 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const ep = await Episode.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!ep) throw new ApiError("Episode not found", 404);
    success(res, ep, "Episode updated");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const ep = await Episode.findById(req.params.id);
    if (!ep) throw new ApiError("Episode not found", 404);

    const cleanup = [];
    if (ep.video?.uid) cleanup.push(deleteVideo(ep.video.uid));
    if (ep.thumbnail?.id) cleanup.push(deleteImage(ep.thumbnail.id));
    await Promise.allSettled(cleanup);

    await ep.deleteOne();
    success(res, {}, "Episode deleted");
  } catch (err) {
    next(err);
  }
};
