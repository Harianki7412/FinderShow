const router = require("express").Router();
const ctrl = require("../controllers/contentController");
const epCtrl = require("../controllers/episodeController");
const { protect, adminOnly, optionalAuth } = require("../middleware/auth");

// Public
router.get("/", ctrl.list);
router.get("/:id", optionalAuth, ctrl.getOne);
router.get("/:contentId/episodes", epCtrl.listByContent);

// Admin
router.post("/", protect, adminOnly, ctrl.create);
router.put("/:id", protect, adminOnly, ctrl.update);
router.delete("/:id", protect, adminOnly, ctrl.remove);

router.post("/:contentId/episodes", protect, adminOnly, epCtrl.create);

module.exports = router;
