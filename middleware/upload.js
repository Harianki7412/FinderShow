const multer = require("multer");

const storage = multer.memoryStorage();

const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image files allowed"), false);
};

const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) return cb(null, true);
  cb(new Error("Only video files allowed"), false);
};

const anyFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    return cb(null, true);
  }
  cb(new Error("Only image or video files allowed"), false);
};

const limits = { fileSize: 1024 * 1024 * 1024 }; // 1 GB max (Cloudinary supports up to 100MB on free tier)

module.exports = {
  uploadImage: multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 15 * 1024 * 1024 },
  }),
  uploadVideo: multer({ storage, fileFilter: videoFilter, limits }),
  uploadAny: multer({ storage, fileFilter: anyFilter, limits }),
  single: (field) =>
    multer({ storage, fileFilter: anyFilter, limits }).single(field),
};
