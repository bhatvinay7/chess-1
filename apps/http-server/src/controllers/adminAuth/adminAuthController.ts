import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";
import { sendOtpEmail } from "../../services/mailService.js";
import { signToken } from "../../utils/middleware.commonfie.js";
import { buildOtpKey, generateOtp, isValidEmail, storeOtp, consumeOtp } from "../../utils/otp.js";

const otpKey = (email: string) => buildOtpKey("admin_otp", email);

export async function requestAdminOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ message: "Valid email is required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);

  if (!user || !user.isAdmin) {
    res.status(401).json({ message: "No admin account found for this email" });
    return;
  }

  const code = generateOtp();

  try {
    await storeOtp(otpKey(email), code);
    await sendOtpEmail(email, code);
    res.json({ message: "OTP sent to your email" });
  } catch {
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
}

export async function verifyAdminOtp(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email || !otp) {
    res.status(400).json({ message: "Email and OTP are required" });
    return;
  }

  const result = await consumeOtp(otpKey(email), otp);

  if (!result.valid) {
    res.status(401).json({
      message: result.expired
        ? "OTP has expired. Please request a new one."
        : "Invalid OTP",
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isAdmin) {
    res.status(403).json({ message: "Access denied" });
    return;
  }

  const token = signToken({ userId: user.id, isAdmin: true });
  res.json({ token, email: user.email, username: user.username });
}
