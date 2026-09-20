import { Router, IRouter } from "express";
import { createTournament } from "../controllers/tournament/createTournament.js";
import {
  listTournaments,
  getMyTournaments,
  getTournament,
  getTournamentRounds,
  getGroupStandings,
  getRoundLeaderboard,
  getMyCurrentGame,
  getTournamentPlayerDashboard,
  joinTournament,
  leaveTournament,
  deleteTournament,
  triggerManualRound,
} from "../controllers/tournament/tournamentController.js";

const router: IRouter = Router();

router.get("/my", getMyTournaments);
router.get("/:id/dashboard", getTournamentPlayerDashboard);
router.get("/:id/my-game", getMyCurrentGame);
router.get("/:id/rounds", getTournamentRounds);
router.get("/:id/rounds/:roundId/leaderboard", getRoundLeaderboard);
router.get("/:id/groups/:groupId/standings", getGroupStandings);
router.get("/:id", getTournament);
router.get("/", listTournaments);
router.post("/", createTournament);
router.post("/:id/manual-trigger", triggerManualRound);
router.post("/:id/join", joinTournament);
router.post("/:id/leave", leaveTournament);
router.delete("/:id", deleteTournament);

export default router;
