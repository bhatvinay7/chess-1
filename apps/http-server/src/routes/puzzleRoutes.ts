import { Router, IRouter } from "express";
import { uploadPuzzle } from "../controllers/puzzle/puzzleController.js";
import { requireAdmin } from "../middleware/adminMiddleware/requireAdmin.js";

const router: IRouter = Router();

router.post("/upload", requireAdmin, uploadPuzzle);

export default router;
