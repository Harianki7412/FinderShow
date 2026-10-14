const {
  uploadImage,
  uploadVideo,
  deleteAsset,
  buildHlsUrl,
} = require("../helpers/cloudinaryHelper");
const { success, ApiError } = require("../helpers/responseHelper");

/**
 * POST /upload/image
 * field: file
 */
exports.uploadImageAsset = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No image file provided", 400);

    const folder = process.env.CLOUDINARY_IMAGE_FOLDER || "findershow/images";
    const result = await uploadImage(req.file.buffer, folder);

    success(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      },
      "Image uploaded",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /upload/video
 * field: file
 * Returns: mp4 fallback + HLS URL (if generated)
 */
exports.uploadVideoAsset = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError("No video file provided", 400);

    const folder = process.env.CLOUDINARY_VIDEO_FOLDER || "findershow/videos";
    const result = await uploadVideo(req.file.buffer, folder, {
      generateHls: true,
    });

    success(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes,
        hls: buildHlsUrl(result.public_id),
        // Eager transformations run async; you can fetch them via Admin API later
      },
      "Video uploaded",
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /upload/:publicId(*)
 * query: ?type=image|video
 */
exports.deleteAsset = async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const type = req.query.type === "video" ? "video" : "image";
    if (!publicId) throw new ApiError("publicId required", 400);

    await deleteAsset(publicId, type);
    success(res, {}, "Deleted from Cloudinary");
  } catch (err) {
    next(err);
  }
};
