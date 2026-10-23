const router = require("express").Router();
const ctrl = require("../controllers/uploadController");
const { protect, adminOnly } = require("../middleware/auth");
const {
  uploadImage,
  uploadVideo,
  uploadSubtitle,
} = require("../middleware/upload");

// Health check (verify Abyss key + network)
router.get("/abyss/health", protect, adminOnly, ctrl.abyssHealth);

// Video (Abyss.to)
router.post(
  "/video",
  protect,
  adminOnly,
  uploadVideo.single("file"),
  ctrl.uploadVideoAsset,
);
router.get("/video/:slug/status", protect, adminOnly, ctrl.getVideoStatus);
router.get("/video/:slug/stream", protect, adminOnly, ctrl.getVideoStream);
router.delete("/video/:slug", protect, adminOnly, ctrl.deleteVideoAsset);

// Subtitles
router.post(
  "/video/:slug/subtitles",
  protect,
  adminOnly,
  uploadSubtitle.single("file"),
  ctrl.uploadSubtitleAsset,
);
router.get(
  "/video/:slug/subtitles",
  protect,
  adminOnly,
  ctrl.listSubtitleAssets,
);
router.delete("/subtitles/:id", protect, adminOnly, ctrl.deleteSubtitleAsset);

// Image (Cloudinary)
router.post(
  "/image",
  protect,
  adminOnly,
  uploadImage.single("file"),
  ctrl.uploadImageAsset,
);
router.delete("/image", protect, adminOnly, ctrl.deleteImageAsset);

module.exports = router;
