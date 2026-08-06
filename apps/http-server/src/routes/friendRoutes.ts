import { Router, IRouter } from "express";
import {
  acceptFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  rejectFriendRequest,
  sendFriendRequest,
} from "../controllers/friends/friendController.js";

const router: IRouter = Router();

router.get("/", listFriends);
router.get("/requests/incoming", listIncomingRequests);
router.get("/requests/outgoing", listOutgoingRequests);
router.post("/requests", sendFriendRequest);
router.post("/requests/:requestId/accept", acceptFriendRequest);
router.post("/requests/:requestId/reject", rejectFriendRequest);

export default router;
