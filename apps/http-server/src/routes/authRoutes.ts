import { Router, IRouter } from "express";
import { adminCreate } from "../controllers/adminAuth/authController.js";
import { requestAdminOtp, verifyAdminOtp } from "../controllers/adminAuth/adminAuthController.js";
import { requireAdmin } from "../middleware/adminMiddleware/requireAdmin.js";

const router: IRouter = Router();

router.post("/request-otp", requestAdminOtp);
router.post("/verify-otp", verifyAdminOtp);
router.post("/create", requireAdmin, adminCreate);

export default router;
