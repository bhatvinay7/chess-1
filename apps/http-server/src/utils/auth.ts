import { Request } from "express";
import { verifyToken } from "./middleware.commonfie.js";

export function getAuthenticatedUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    return verifyToken(authHeader.slice(7)).userId;
  } catch {
    return null;
  }
}
