import { Request, Response } from "express";
import { prisma } from "@repo/postgres-db";

export async function adminCreate(req: Request, res: Response): Promise<void> {
  const { name, email } = req.body as { name?: string; email?: string };

  if (!name || !email) {
    res.status(400).json({ message: "Name and email are required" });
    return;
  }

  const existing = await prisma.user
    .findUnique({ where: { email } })
    .catch(() => null);
  if (existing) {
    res
      .status(409)
      .json({ message: "An account with this email already exists" });
    return;
  }

  const username = name.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now();

  try {
    const admin = await prisma.user.create({
      data: { username, email, isAdmin: true },
    });
    res
      .status(201)
      .json({
        message: "Admin created",
        username: admin.username,
        email: admin.email,
      });
  } catch {
    res.status(500).json({ message: "Internal server error" });
  }
}
