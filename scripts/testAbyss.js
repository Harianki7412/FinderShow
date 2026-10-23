require("dotenv").config();
const { getAbout } = require("../helpers/abyssHelper");

(async () => {
  try {
    console.log("Testing Abyss API with key:", process.env.ABYSS_API_KEY);
    const about = await getAbout();
    console.log("✅ Abyss OK. Quota:", JSON.stringify(about, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("❌ Abyss check failed:", err.message);
    process.exit(1);
  }
})();
