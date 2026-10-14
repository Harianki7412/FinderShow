const router = require("express").Router();
const ctrl = require("../controllers/episodeController");
const { protect, adminOnly } = require("../middleware/auth");

router.put("/:id", protect, adminOnly, ctrl.update);
router.delete("/:id", protect, adminOnly, ctrl.remove);

module.exports = router;
