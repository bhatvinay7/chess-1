import { Router, IRouter } from "express";
import {
  requestOtp,
  verifyOtp,
  verifyLogin,
  verifySignup,
  loginWithPassword,
  signupVerifyOtp,
  requestPasswordReset,
  resetPassword,
  googleAuth,
} from "../controllers/userAuth/userAuthController.js";

const router: IRouter = Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", verifyLogin);
router.post("/signup", verifySignup);

router.post("/login-password", loginWithPassword);
router.post("/signup-verify", signupVerifyOtp);
router.post("/reset-password/request", requestPasswordReset);
router.post("/reset-password/confirm", resetPassword);
router.post("/google", googleAuth);

export default router;
