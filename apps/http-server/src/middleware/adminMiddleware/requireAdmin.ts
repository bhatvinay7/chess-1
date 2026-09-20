import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../../utils/middleware.commonfie.js";

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    if (!payload.isAdmin) {
      res.status(403).json({ message: "Forbidden: admin only" });
      return;
    }
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}
