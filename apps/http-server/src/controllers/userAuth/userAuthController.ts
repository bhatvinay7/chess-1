import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";
import bcrypt from "bcryptjs";
import {
  sendOtpEmail,
  sendPasswordResetEmail,
} from "../../services/mailService.js";
import { signToken } from "../../utils/middleware.commonfie.js";
import {
  buildOtpKey,
  generateOtp,
  isValidEmail,
  storeOtp,
  consumeOtp,
} from "../../utils/otp.js";
import { syncUserToMongo } from "@repo/mongo-db";

const otpKey = (email: string) => buildOtpKey("otp", email);
const resetOtpKey = (email: string) => buildOtpKey("reset", email);

export async function requestOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email || !isValidEmail(email)) {
    res.status(400).json({ message: "Valid email is required" });
    return;
  }

  const code = generateOtp();

  try {
    await storeOtp(otpKey(email), code);
    console.log(`[Auth] Attempting to send OTP email to ${email}...`);
    sendOtpEmail(email, code)
      .then(() => console.log(`[Auth] OTP email successfully sent to ${email}`))
      .catch((err) =>
        console.error(`[Auth] Background email send failed to ${email}:`, err),
      );
    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error(
      "Error sending OTP email:",
      error instanceof Error ? error.message : error,
    );
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, username } = req.body as {
      email?: string;
      otp?: string;
      username?: string;
    };

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

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const emailPrefix = (email.split("@")[0] ?? "user").replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      );
      const generatedUsername =
        username?.trim() || `${emailPrefix}_${Date.now()}`;
      user = await prisma.user.create({
        data: {
          username: generatedUsername,
          email,
          isAdmin: false,
          ratings: {
            create: [
              { category: "BULLET" },
              { category: "BLITZ" },
              { category: "RAPID" },
            ],
          },
        },
      });
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function verifyLogin(req: Request, res: Response): Promise<void> {
  try {
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

    if (!user) {
      res
        .status(404)
        .json({ message: "No account found for this email. Please sign up." });
      return;
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function verifySignup(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp, username } = req.body as {
      email?: string;
      otp?: string;
      username?: string;
    };

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

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const emailPrefix = (email.split("@")[0] ?? "user").replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      );
      const generatedUsername =
        username?.trim() || `${emailPrefix}_${Date.now()}`;

      user = await prisma.user.create({
        data: {
          username: generatedUsername,
          email,
          isAdmin: false,
          ratings: {
            create: [
              { category: "BULLET" },
              { category: "BLITZ" },
              { category: "RAPID" },
            ],
          },
        },
      });
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function loginWithPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { authMethods: true },
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const credAuth = user.authMethods.find(
      (a: (typeof user.authMethods)[number]) => a.authType === "CREDENTIALS",
    );
    const passwordHash = credAuth?.passwordHash || user.password;

    if (!passwordHash) {
      res
        .status(401)
        .json({
          message:
            "Invalid email or password. If you signed up with Google, please use Google sign-in.",
        });
      return;
    }

    const valid = await bcrypt.compare(password, passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    if (!credAuth) {
      await prisma.userAuth
        .create({
          data: {
            userId: user.id,
            authType: "CREDENTIALS",
            providerId: email,
            passwordHash: passwordHash,
          },
        })
        .catch(() => {});
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function signupVerifyOtp(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, otp, username, password } = req.body as {
      email?: string;
      otp?: string;
      username?: string;
      password?: string;
    };

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

    let user = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    if (!user) {
      const emailPrefix = (email.split("@")[0] ?? "user").replace(
        /[^a-zA-Z0-9_]/g,
        "_",
      );
      const generatedUsername =
        username?.trim() || `${emailPrefix}_${Date.now()}`;
      user = await prisma.user.create({
        data: {
          username: generatedUsername,
          email,
          isAdmin: false,
          ...(hashedPassword ? { password: hashedPassword } : {}),
          ratings: {
            create: [
              { category: "BULLET" },
              { category: "BLITZ" },
              { category: "RAPID" },
            ],
          },
          authMethods: {
            create: [
              {
                authType: "CREDENTIALS",
                providerId: email,
                passwordHash: hashedPassword,
              },
            ],
          },
        },
      });
    } else if (hashedPassword) {
      const credAuth = await prisma.userAuth.findFirst({
        where: { userId: user.id, authType: "CREDENTIALS" },
      });
      if (!credAuth) {
        await prisma.userAuth
          .create({
            data: {
              userId: user.id,
              authType: "CREDENTIALS",
              providerId: email,
              passwordHash: hashedPassword,
            },
          })
          .catch(() => {});
      }
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function requestPasswordReset(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ message: "Valid email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "No account found with that email" });
      return;
    }

    const code = generateOtp();
    await storeOtp(resetOtpKey(email), code);
    console.log(
      `[Auth] Attempting to send password reset email to ${email}...`,
    );
    sendPasswordResetEmail(email, code)
      .then(() =>
        console.log(
          `[Auth] Password reset email successfully sent to ${email}`,
        ),
      )
      .catch((err) =>
        console.error(`[Auth] Background email send failed to ${email}:`, err),
      );
    res.json({ message: "Password reset code sent to your email" });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { email, otp, newPassword } = req.body as {
      email?: string;
      otp?: string;
      newPassword?: string;
    };
    if (!email || !otp || !newPassword) {
      res
        .status(400)
        .json({ message: "Email, OTP, and new password are required" });
      return;
    }
    if (newPassword.length < 6) {
      res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
      return;
    }

    const result = await consumeOtp(resetOtpKey(email), otp);
    if (!result.valid) {
      res.status(401).json({
        message: result.expired
          ? "OTP has expired. Please request a new one."
          : "Invalid OTP",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
    const credAuth = await prisma.userAuth.findFirst({
      where: { providerId: email, authType: "CREDENTIALS" },
    });
    if (credAuth) {
      await prisma.userAuth.update({
        where: { id: credAuth.id },
        data: { passwordHash: hashedPassword },
      });
    } else {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        await prisma.userAuth
          .create({
            data: {
              userId: user.id,
              authType: "CREDENTIALS",
              providerId: email,
              passwordHash: hashedPassword,
            },
          })
          .catch(() => {});
      }
    }

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}

export async function googleAuth(req: Request, res: Response): Promise<void> {
  try {
    const {
      idToken,
      email: bodyEmail,
      name: bodyName,
      picture: bodyPicture,
    } = req.body as {
      idToken?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!idToken) {
      res.status(400).json({ message: "Google ID token is required" });
      return;
    }

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!googleRes.ok) {
      res.status(401).json({ message: "Invalid or expired Google token" });
      return;
    }

    const tokenInfo = (await googleRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    const sub = tokenInfo.sub;
    const email = tokenInfo.email || bodyEmail;
    const name = tokenInfo.name || bodyName;
    const picture = tokenInfo.picture || bodyPicture;

    if (!sub || !email) {
      res
        .status(400)
        .json({
          message: "Google token did not contain required email and identity",
        });
      return;
    }

    let userAuth = await prisma.userAuth.findFirst({
      where: {
        OR: [{ providerId: sub }, { providerId: email, authType: "GOOGLE" }],
      },
      include: { user: true },
    });

    let user = userAuth?.user;

    if (!user) {
      user = (await prisma.user.findUnique({ where: { email } })) || undefined;
      if (user) {
        await prisma.userAuth
          .create({
            data: {
              userId: user.id,
              authType: "GOOGLE",
              providerId: sub,
            },
          })
          .catch(() => {});
      } else {
        const emailPrefix = (email.split("@")[0] ?? "user").replace(
          /[^a-zA-Z0-9_]/g,
          "_",
        );
        const generatedUsername =
          name?.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20) ||
          `${emailPrefix}_${Date.now()}`;

        user = await prisma.user.create({
          data: {
            username: generatedUsername,
            email,
            profileImageUrl: picture || null,
            isAdmin: false,
            ratings: {
              create: [
                { category: "BULLET" },
                { category: "BLITZ" },
                { category: "RAPID" },
              ],
            },
            authMethods: {
              create: [
                {
                  authType: "GOOGLE",
                  providerId: sub,
                },
              ],
            },
          },
        });
      }
    }

    const token = signToken({ userId: user.id, isAdmin: false });
    syncUserToMongo(user.id).catch(console.error);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email ?? null,
        rating: user.rating,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({
        message: error instanceof Error ? error.message : String(error),
      });
  }
}
