import { Router, IRouter } from "express";
import {
  createInvite,
  getSentInvites,
  getReceivedInvites,
  acceptInvite,
  rejectInvite,
} from "../controllers/invites/inviteController.js";

const router: IRouter = Router();

router.post("/", createInvite);
router.get("/sent", getSentInvites);
router.get("/received", getReceivedInvites);
router.post("/:id/accept", acceptInvite);
router.post("/:id/reject", rejectInvite);

export default router;
