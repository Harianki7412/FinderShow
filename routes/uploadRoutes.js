const router = require("express").Router();
const ctrl = require("../controllers/uploadController");
const { protect, adminOnly } = require("../middleware/auth");
const { uploadImage } = require("../middleware/upload");

// ── Video (Cloudflare Stream) ──
router.post("/video/direct-url", protect, adminOnly, ctrl.createVideoUploadUrl);
router.post("/video/from-url", protect, adminOnly, ctrl.uploadVideoFromUrl);
router.get("/video/:uid/status", protect, adminOnly, ctrl.getVideoStatus);
router.delete("/video/:uid", protect, adminOnly, ctrl.deleteVideoAsset);

// ── Images (Cloudflare Images) ──
router.post(
  "/image",
  protect,
  adminOnly,
  uploadImage.single("file"),
  ctrl.uploadImageAsset,
);
router.post(
  "/images",
  protect,
  adminOnly,
  uploadImage.array("files", 5),
  ctrl.uploadMultipleImages,
);
router.delete("/image/:id", protect, adminOnly, ctrl.deleteImageAsset);

module.exports = router;
