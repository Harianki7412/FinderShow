const express = require("express");
const {
  createTournament,
  joinTournament,
  getTournaments,
  getTournamentStandings,
  updateTournamentScore,
} = require("../controllers/tournamentController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/create", createTournament);
router.post("/join/:id", joinTournament);
router.get("/", getTournaments);
router.get("/:id/standings", getTournamentStandings);
router.put("/score", updateTournamentScore);

module.exports = router;
