const fs = require("fs/promises");
const {
  uploadVideo: abyssUpload,
  uploadSubtitle: abyssUploadSub,
  getFile,
  deleteFile,
  getEmbedUrl,
  getStreamInfo,
  listSubtitles,
  deleteSubtitle,
} = require("../helpers/abyssHelper");
const { uploadImage, deleteImage } = require("../helpers/cloudinaryHelper");
const { success, ApiError } = require("../helpers/responseHelper");

// ─────────────────────────────────────────────
//  VIDEO (Abyss.to)
// ─────────────────────────────────────────────

/**
 * POST /upload/video
 * Multipart field "file" → disk → Abyss.
 */
exports.uploadVideoAsset = async (req, res, next) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) throw new ApiError("No video file provided", 400);

    const { slug } = await abyssUpload(filePath, req.file.originalname);

    // Best-effort metadata fetch (status may be 'waiting')
    let meta = {};
    try {
      meta = await getFile(slug);
    } catch (_) {}

    success(
      res,
      {
        slug,
        embedUrl: getEmbedUrl(slug),
        name: meta.name || req.file.originalname,
        size: meta.size || req.file.size,
        status: meta.status || "waiting",
        resolutions: meta.resolutions || [],
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      },
      "Video uploaded to Abyss.to",
    );
  } catch (err) {
    next(err);
  } finally {
    if (filePath) await fs.unlink(filePath).catch(() => {});
  }
};

/**
 * GET /upload/video/:slug/status
 */
exports.getVideoStatus = async (req, res, next) => {
  try {
    const file = await getFile(req.params.slug);
    success(res, {
      slug: file.id,
      name: file.name,
      size: file.size,
      status: file.status,
      resolutions: file.resolutions || [],
      embedUrl: getEmbedUrl(file.id),
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /upload/video/:slug/stream
 * Returns embedUrl + best-effort directUrl for the mobile player.
 */
exports.getVideoStream = async (req, res, next) => {
  try {
    const info = await getStreamInfo(req.params.slug);
    success(res, info);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /upload/video/:slug
 */
exports.deleteVideoAsset = async (req, res, next) => {
  try {
    await deleteFile(req.params.slug);
    success(res, { slug: req.params.slug }, "Video deleted from Abyss.to");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  IMAGE (Cloudinary)
// ─────────────────────────────────────────────

/**
 * POST /upload/image
 * Multipart field "file" → buffer → Cloudinary.
 */
exports.uploadImageAsset = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No image file provided", 400);

    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname || `image-${Date.now()}`,
    );

    success(
      res,
      {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      },
      "Image uploaded to Cloudinary",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /upload/image
 * Body: { publicId: string }
 */
exports.deleteImageAsset = async (req, res, next) => {
  try {
    const { publicId } = req.body;
    if (!publicId) throw new ApiError("publicId required", 400);

    await deleteImage(publicId);
    success(res, { publicId }, "Image deleted from Cloudinary");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  SUBTITLES (Abyss.to)
// ─────────────────────────────────────────────

exports.uploadSubtitleAsset = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No subtitle file provided", 400);
    const { language = "English", filename } = req.query;
    const result = await abyssUploadSub(
      req.params.slug,
      req.file.buffer,
      language,
      filename || req.file.originalname,
    );
    success(res, result, "Subtitle uploaded");
  } catch (err) {
    next(err);
  }
};

exports.listSubtitleAssets = async (req, res, next) => {
  try {
    const items = await listSubtitles(req.params.slug);
    success(res, { items });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubtitleAsset = async (req, res, next) => {
  try {
    await deleteSubtitle(req.params.id);
    success(res, { id: req.params.id }, "Subtitle deleted");
  } catch (err) {
    next(err);
  }
};
