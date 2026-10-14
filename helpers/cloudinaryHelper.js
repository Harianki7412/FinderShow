const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Stream a buffer to Cloudinary.
 */
const uploadBuffer = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

/** Upload image (poster, thumbnail, avatar) */
const uploadImage = (buffer, folder) =>
  uploadBuffer(buffer, {
    folder,
    resource_type: "image",
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

/**
 * Upload large video with HLS streaming profile.
 * Cloudinary converts to adaptive bitrate HLS automatically.
 * For paid plans we can generate multiple qualities.
 */
const uploadVideo = (buffer, folder, { generateHls = true } = {}) =>
  uploadBuffer(buffer, {
    folder,
    resource_type: "video",
    chunk_size: 6000000, // 6 MB chunks for big files
    eager: generateHls
      ? [
          { streaming_profile: "hd", format: "m3u8" }, // adaptive HLS
          { quality: "auto", format: "mp4" }, // fallback MP4
        ]
      : [{ quality: "auto", format: "mp4" }],
    eager_async: true,
    eager_notification_url: undefined,
  });

/** Delete asset by publicId + resource type */
const deleteAsset = (publicId, resourceType = "image") =>
  cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });

/** Build HLS URL from Cloudinary publicId */
const buildHlsUrl = (publicId) =>
  cloudinary.url(publicId, {
    resource_type: "video",
    streaming_profile: "hd",
    format: "m3u8",
  });

/** Signed URL for private/paid content (time-limited) */
const signedVideoUrl = (publicId, expiresInSeconds = 3600) =>
  cloudinary.url(publicId, {
    resource_type: "video",
    sign_url: true,
    type: "authenticated",
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });

module.exports = {
  uploadBuffer,
  uploadImage,
  uploadVideo,
  deleteAsset,
  buildHlsUrl,
  signedVideoUrl,
};
