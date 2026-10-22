const multer = require("multer");
const path = require("path");
const fs = require("fs");

const TMP_DIR = path.join(__dirname, "..", "tmp", "uploads");
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ── Images: memory storage (max 10 MB — Cloudinary limit) ──
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error("Only image files are allowed"), false);
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Videos: disk storage (max 10 GB — Abyss limit) ──
const videoFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) return cb(null, true);
  cb(new Error("Only video files are allowed"), false);
};

const videoDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TMP_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const uploadVideo = multer({
  storage: videoDiskStorage,
  fileFilter: videoFilter,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 },
});

// ── Subtitles: memory storage (max 2 MB) ──
const subtitleFilter = (req, file, cb) => {
  const ok =
    /\.(srt|vtt|ass|ssa)$/i.test(file.originalname) ||
    file.mimetype === "text/plain";
  ok ? cb(null, true) : cb(new Error("Only subtitle files allowed"), false);
};

const uploadSubtitle = multer({
  storage: multer.memoryStorage(),
  fileFilter: subtitleFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { uploadImage, uploadVideo, uploadSubtitle, TMP_DIR };
