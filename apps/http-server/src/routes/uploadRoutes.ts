import { Router } from "express";
import {
  uploadSingle,
  uploadMultiple,
} from "../middleware/uploadMiddleware.js";
import {
  handleFileUpload,
  handleMultipleUploads,
} from "../controllers/upload/uploadController.js";

const router: Router = Router();

router.post("/single", uploadSingle, handleFileUpload);
router.post("/multiple", uploadMultiple, handleMultipleUploads);

export default router;
