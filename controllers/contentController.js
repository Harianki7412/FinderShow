const Content = require("../models/Content");
const Episode = require("../models/Episode");
const { deleteImage } = require("../helpers/cloudinaryHelper");
const { deleteFile } = require("../helpers/abyssHelper");
const { success, ApiError } = require("../helpers/responseHelper");

exports.list = async (req, res, next) => {
  try {
    const { type, genre, search, featured, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };
    if (type) filter.type = type;
    if (genre) filter.genres = genre;
    if (featured) filter.isFeatured = featured === "true";
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Content.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Content.countDocuments(filter),
    ]);

    success(res, {
      items,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id).lean();
    if (!content) throw new ApiError("Content not found", 404);

    if (content.type !== "movie") {
      const episodes = await Episode.find({
        content: content._id,
        isPublished: true,
      })
        .sort({ seasonNumber: 1, episodeNumber: 1 })
        .lean();

      const seasonsMap = {};
      episodes.forEach((ep) => {
        const s = ep.seasonNumber;
        if (!seasonsMap[s]) {
          seasonsMap[s] = { seasonNumber: s, episodes: [] };
        }
        seasonsMap[s].episodes.push(ep);
      });

      content.seasons = Object.values(seasonsMap).sort(
        (a, b) => a.seasonNumber - b.seasonNumber,
      );
    }

    success(res, content);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const content = await Content.create({
      ...req.body,
      createdBy: req.user._id,
    });
    success(res, content, "Content created", 201);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!content) throw new ApiError("Content not found", 404);
    success(res, content, "Content updated");
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) throw new ApiError("Content not found", 404);

    const cleanup = [];

    // Cloudinary images
    if (content.poster?.publicId)
      cleanup.push(deleteImage(content.poster.publicId));
    if (content.backdrop?.publicId)
      cleanup.push(deleteImage(content.backdrop.publicId));

    // Abyss videos
    if (content.trailer?.slug) cleanup.push(deleteFile(content.trailer.slug));
    if (content.video?.slug) cleanup.push(deleteFile(content.video.slug));

    // Episodes
    const episodes = await Episode.find({ content: content._id });
    episodes.forEach((ep) => {
      if (ep.video?.slug) cleanup.push(deleteFile(ep.video.slug));
      if (ep.thumbnail?.publicId)
        cleanup.push(deleteImage(ep.thumbnail.publicId));
    });

    await Promise.allSettled(cleanup);
    await Episode.deleteMany({ content: content._id });
    await content.deleteOne();

    success(res, {}, "Content and all media deleted");
  } catch (err) {
    next(err);
  }
};
