import { Request, RequestHandler } from "express";
import multer, { StorageEngine, FileFilterCallback, MulterError } from "multer";

const storage: StorageEngine = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
});

// Explicit RequestHandler types resolve the ParsedQs portability error
export const uploadSingle: RequestHandler = upload.single("file");
export const uploadMultiple: RequestHandler = upload.array("files", 5);
