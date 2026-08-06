import { Router, IRouter } from "express";
import {
  createClub,
  getClub,
  listClubs,
  updateClub,
  requestJoinClub,
  handleJoinRequest,
  removeMember,
  sendCoordinatorInvite,
  handleCoordinatorInvite,
  getJoinRequests,
  getMyAdminClubs,
} from "../controllers/club/clubController.js";
import { getClubTournaments } from "../controllers/tournament/tournamentController.js";

const router: IRouter = Router();

router.get("/mine", getMyAdminClubs);
router.get("/", listClubs);
router.post("/", createClub);

router.get("/:clubId/tournaments", getClubTournaments);
router.get("/:clubId", getClub);
router.put("/:clubId", updateClub);

router.post("/:clubId/join", requestJoinClub);
router.get("/:clubId/requests", getJoinRequests);
router.patch("/:clubId/requests/:requestId", handleJoinRequest);
router.delete("/:clubId/members/:userId", removeMember);

router.post("/:clubId/coordinator-invite", sendCoordinatorInvite);
router.patch("/:clubId/coordinator-invite/:inviteId", handleCoordinatorInvite);

export default router;
