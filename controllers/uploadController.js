const {
  createDirectUploadUrl,
  uploadVideoFromUrl,
  getVideo,
  deleteVideo,
  getHlsUrl,
  getThumbnailUrl,
  uploadImage,
  deleteImage,
} = require("../helpers/cloudflareHelper");
const { success, ApiError } = require("../helpers/responseHelper");

// ─────────────────────────────────────────────
//  VIDEO UPLOADS (Cloudflare Stream)
// ─────────────────────────────────────────────

exports.createVideoUploadUrl = async (req, res, next) => {
  try {
    const { maxDurationSeconds = 7200, meta = {} } = req.body;

    const result = await createDirectUploadUrl({
      maxDurationSeconds,
      creator: req.user._id.toString(),
      meta: {
        ...meta,
        uploadedBy: req.user.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    success(
      res,
      { uploadURL: result.uploadURL, uid: result.uid },
      "Upload URL created",
    );
  } catch (err) {
    next(err);
  }
};

exports.uploadVideoFromUrl = async (req, res, next) => {
  try {
    const { url, meta = {} } = req.body;
    if (!url) throw new ApiError("URL is required", 400);

    const result = await uploadVideoFromUrl(url, {
      ...meta,
      uploadedBy: req.user.name,
    });

    success(
      res,
      {
        uid: result.uid,
        hlsUrl: getHlsUrl(result.uid),
        thumbnail: getThumbnailUrl(result.uid),
        status: result.status,
        readyToStream: result.readyToStream,
      },
      "Video ingestion started",
    );
  } catch (err) {
    next(err);
  }
};

exports.getVideoStatus = async (req, res, next) => {
  try {
    const video = await getVideo(req.params.uid);
    success(res, {
      uid: video.uid,
      status: video.status,
      readyToStream: video.readyToStream,
      duration: video.duration,
      size: video.size,
      thumbnail: getThumbnailUrl(video.uid),
      hlsUrl: getHlsUrl(video.uid),
      playback: video.playback,
      meta: video.meta,
      created: video.created,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteVideoAsset = async (req, res, next) => {
  try {
    const { uid } = req.params;
    if (!uid) throw new ApiError("Video UID is required", 400);

    await deleteVideo(uid);
    success(res, { uid }, "Video deleted from Stream");
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────
//  IMAGE UPLOADS (Cloudflare Images)
// ─────────────────────────────────────────────

exports.uploadImageAsset = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No image file provided", 400);

    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname || `image-${Date.now()}.jpg`,
      { creator: req.user._id.toString() },
    );

    const variants = result.variants || [];
    const url = variants[0] || "";
    const thumbnail = variants[1] || variants[0] || "";

    success(
      res,
      {
        id: result.id,
        url,
        thumbnail,
        variants,
        filename: result.filename,
      },
      "Image uploaded",
    );
  } catch (err) {
    next(err);
  }
};

exports.uploadMultipleImages = async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) throw new ApiError("No image files provided", 400);

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      try {
        const result = await uploadImage(
          file.buffer,
          file.originalname || `image-${Date.now()}.jpg`,
          { creator: req.user._id.toString() },
        );
        const variants = result.variants || [];
        uploaded.push({
          id: result.id,
          url: variants[0] || "",
          thumbnail: variants[1] || variants[0] || "",
          variants,
          filename: result.filename,
          originalName: file.originalname,
        });
      } catch (err) {
        failed.push({ originalName: file.originalname, error: err.message });
      }
    }

    success(
      res,
      { uploaded, failed },
      `${uploaded.length} uploaded, ${failed.length} failed`,
      uploaded.length ? 200 : 400,
    );
  } catch (err) {
    next(err);
  }
};

exports.deleteImageAsset = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) throw new ApiError("Image ID is required", 400);

    await deleteImage(id);
    success(res, { id }, "Image deleted");
  } catch (err) {
    next(err);
  }
};
