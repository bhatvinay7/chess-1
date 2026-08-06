import jwt from "jsonwebtoken";
export interface AdminPayload {
  userId: string;
  isAdmin: boolean;
}

export function signToken(payload: AdminPayload): string {
    const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AdminPayload {
  const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
  return jwt.verify(token, JWT_SECRET) as AdminPayload;
}
