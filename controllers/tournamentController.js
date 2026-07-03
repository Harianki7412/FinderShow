const tournamentModel = require("../models/tournamentModel");

const createTournament = async (req, res) => {
  try {
    const { name, description, startDate, endDate, maxParticipants } = req.body;
    if (!name || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Name, start date, and end date are required",
      });
    }
    const tournament = new tournamentModel({
      name,
      description,
      startDate,
      endDate,
      createdBy: req.user._id,
      maxParticipants: maxParticipants || 50,
      participants: [{ user: req.user._id, score: 0, gamesPlayed: 0 }],
      status:
        new Date() < startDate
          ? "upcoming"
          : new Date() > endDate
            ? "completed"
            : "active",
    });
    await tournament.save();
    res.status(201).json({ success: true, tournament });
  } catch (error) {
    console.error("Create tournament error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const joinTournament = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await tournamentModel.findById(id);
    if (!tournament)
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    if (tournament.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Tournament already completed" });
    }
    if (
      tournament.participants.some(
        (p) => p.user.toString() === req.user._id.toString(),
      )
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Already joined" });
    }
    if (tournament.participants.length >= tournament.maxParticipants) {
      return res
        .status(400)
        .json({ success: false, message: "Tournament is full" });
    }
    tournament.participants.push({
      user: req.user._id,
      score: 0,
      gamesPlayed: 0,
    });
    await tournament.save();
    res.status(200).json({ success: true, tournament });
  } catch (error) {
    console.error("Join tournament error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTournaments = async (req, res) => {
  try {
    const tournaments = await tournamentModel
      .find()
      .populate("createdBy", "name email")
      .populate("participants.user", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, tournaments });
  } catch (error) {
    console.error("Get tournaments error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTournamentStandings = async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await tournamentModel
      .findById(id)
      .populate("participants.user", "name email");
    if (!tournament)
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    const standings = tournament.participants.sort((a, b) => b.score - a.score);
    res.status(200).json({
      success: true,
      tournament: { ...tournament._doc, participants: standings },
    });
  } catch (error) {
    console.error("Get tournament standings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateTournamentScore = async (req, res) => {
  try {
    const { tournamentId, playerId, pointsEarned } = req.body;
    if (!tournamentId || !playerId || pointsEarned === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    const tournament = await tournamentModel.findById(tournamentId);
    if (!tournament)
      return res
        .status(404)
        .json({ success: false, message: "Tournament not found" });
    const participant = tournament.participants.find(
      (p) => p.user.toString() === playerId,
    );
    if (!participant)
      return res
        .status(404)
        .json({ success: false, message: "Player not in this tournament" });
    participant.score += pointsEarned;
    participant.gamesPlayed += 1;
    await tournament.save();
    res.status(200).json({ success: true, tournament });
  } catch (error) {
    console.error("Update tournament score error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTournament,
  joinTournament,
  getTournaments,
  getTournamentStandings,
  updateTournamentScore,
};
