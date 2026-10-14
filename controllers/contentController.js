const Content = require("../models/Content");
const Episode = require("../models/Episode");
const { deleteAsset } = require("../helpers/cloudinaryHelper");
const { success, ApiError } = require("../helpers/responseHelper");

// GET /content
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

// GET /content/:id
exports.getOne = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id).lean();
    if (!content) throw new ApiError("Content not found", 404);

    // Attach seasons + episodes for series/anime
    if (content.type !== "movie") {
      const episodes = await Episode.find({
        content: content._id,
        isPublished: true,
      })
        .sort({ seasonNumber: 1, episodeNumber: 1 })
        .select("-video.publicId") // never expose publicId
        .lean();

      const seasonsMap = {};
      episodes.forEach((ep) => {
        const s = ep.seasonNumber;
        if (!seasonsMap[s]) seasonsMap[s] = { seasonNumber: s, episodes: [] };
        seasonsMap[s].episodes.push(ep);
      });

      content.seasons = Object.values(seasonsMap).sort(
        (a, b) => a.seasonNumber - b.seasonNumber,
      );
    } else {
      // Hide raw publicId from public response
      if (content.video) delete content.video.publicId;
    }

    success(res, content);
  } catch (err) {
    next(err);
  }
};

// POST /content  (admin)
exports.create = async (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };
    const content = await Content.create(payload);
    success(res, content, "Content created", 201);
  } catch (err) {
    next(err);
  }
};

// PUT /content/:id  (admin)
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

// DELETE /content/:id  (admin) — also cleans up Cloudinary assets + episodes
exports.remove = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) throw new ApiError("Content not found", 404);

    // Collect all publicIds
    const deletes = [];
    if (content.poster?.publicId)
      deletes.push(deleteAsset(content.poster.publicId, "image"));
    if (content.backdrop?.publicId)
      deletes.push(deleteAsset(content.backdrop.publicId, "image"));
    if (content.trailer?.publicId)
      deletes.push(deleteAsset(content.trailer.publicId, "video"));
    if (content.video?.publicId)
      deletes.push(deleteAsset(content.video.publicId, "video"));

    // Episodes
    const episodes = await Episode.find({ content: content._id });
    episodes.forEach((ep) => {
      if (ep.video?.publicId)
        deletes.push(deleteAsset(ep.video.publicId, "video"));
      if (ep.thumbnail?.publicId)
        deletes.push(deleteAsset(ep.thumbnail.publicId, "image"));
    });

    await Promise.allSettled(deletes);
    await Episode.deleteMany({ content: content._id });
    await content.deleteOne();

    success(res, {}, "Content and all assets deleted");
  } catch (err) {
    next(err);
  }
};
