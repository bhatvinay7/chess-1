import { Router, IRouter } from "express";
import {
  getPublicUserProfile,
  getUserGameHistory,
  searchUsers,
} from "../controllers/users/userController.js";

const router: IRouter = Router();

router.get("/search", searchUsers);
router.get("/:userId/profile", getPublicUserProfile);
router.get("/:userId/history", getUserGameHistory);

export default router;
