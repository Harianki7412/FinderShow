const router = require("express").Router();

router.use("/auth", require("./authRoutes"));
router.use("/upload", require("./uploadRoutes"));
router.use("/content", require("./contentRoutes"));
router.use("/episodes", require("./episodeRoutes"));
router.use("/ads", require("./adRoutes"));
router.use("/watch", require("./watchRoutes"));
router.use("/plans", require("./subscriptionRoutes"));
router.use("/subscription", require("./subscriptionRoutes"));
router.use("/payment", require("./paymentRoutes"));

module.exports = router;
