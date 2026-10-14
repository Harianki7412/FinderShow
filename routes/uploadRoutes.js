const router = require("express").Router();
const ctrl = require("../controllers/uploadController");
const { protect, adminOnly } = require("../middleware/auth");
const { uploadImage, uploadVideo } = require("../middleware/upload");

router.post(
  "/image",
  protect,
  adminOnly,
  uploadImage.single("file"),
  ctrl.uploadImageAsset,
);
router.post(
  "/video",
  protect,
  adminOnly,
  uploadVideo.single("file"),
  ctrl.uploadVideoAsset,
);
router.delete("/:publicId", protect, adminOnly, ctrl.deleteAsset);

module.exports = router;
