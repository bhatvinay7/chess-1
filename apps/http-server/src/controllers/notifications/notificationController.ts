import { Request, Response } from "express";
import { mongoPrisma } from "@repo/mongo-db";
import { getAuthenticatedUserId } from "../../utils/auth.js";

export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const notifications = await mongoPrisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const notificationId = req.params.id;

    if (!userId || !notificationId) {
      res.status(400).json({ message: "Missing id or unauthorized" });
      return;
    }

    const notification = await mongoPrisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      res.status(404).json({ message: "Notification not found" });
      return;
    }

    if (notification.userId !== userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const updated = await mongoPrisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.status(200).json({ message: "Marked as read", notification: updated });
  } catch (error) {
    console.error("[markAsRead] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await mongoPrisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[markAllAsRead] Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
