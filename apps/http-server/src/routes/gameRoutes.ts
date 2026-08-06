import { Router, IRouter } from "express";
import { getMyGameHistory, getGameById, saveGameAnalysis, getRatingHistory, getRatingHistoryByCategory } from "../controllers/game/gameController.js";

const router: IRouter = Router();

router.get("/rating-history", getRatingHistory);
router.get("/rating-history/by-category", getRatingHistoryByCategory);
router.get("/history", getMyGameHistory);
router.get("/:gameId", getGameById);
router.post("/:gameId/analysis", saveGameAnalysis);

export default router;
