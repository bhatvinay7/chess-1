import { Router } from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notifications/notificationController.js";

const router: Router = Router();

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
