const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

const uploadImage = (buffer, filename, folder) => {
  const targetFolder =
    folder || process.env.CLOUDINARY_IMAGE_FOLDER || "findershow/images";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: targetFolder,
        resource_type: "image",
        public_id: (filename || "image").replace(/\.[^.]+$/, ""),
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const deleteImage = async (publicId) => {
  if (!publicId) return false;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true,
    });
    return result.result === "ok" || result.result === "not found";
  } catch (_) {
    return false;
  }
};

const buildTransformedUrl = (publicId, width = 400) =>
  cloudinary.url(publicId, {
    width,
    crop: "fill",
    quality: "auto",
    fetch_format: "auto",
    secure: true,
  });

module.exports = { uploadImage, deleteImage, buildTransformedUrl };
