import { Router, IRouter } from "express";
import {
  getUserProfile,
  updateUserProfile,
} from "../controllers/profile/userProfile.js";
// import { requireUser } from "../middleware/userMiddleware/userMiddleware.js"; // I might need to fix this middleware name/logic

const router: IRouter = Router();

router.get("/:userId", getUserProfile);
router.put("/:userId", updateUserProfile);

export default router;
