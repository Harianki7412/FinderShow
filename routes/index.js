const router = require("express").Router();

router.use("/auth", require("./authRoutes"));
router.use("/content", require("./contentRoutes"));
router.use("/episodes", require("./episodeRoutes"));
router.use("/upload", require("./uploadRoutes"));
router.use("/plans", require("./subscriptionRoutes"));
router.use("/subscription", require("./subscriptionRoutes"));
router.use("/payment", require("./paymentRoutes"));
router.use("/ads", require("./adRoutes"));
router.use("/watch", require("./watchRoutes"));

module.exports = router;
