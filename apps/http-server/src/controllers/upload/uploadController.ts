import { Request, Response } from "express";
import { uploadToCloudinary } from "../../services/uploadService.js";

export const handleFileUpload = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const folder = (req.body.folder as string) || "profile_pics";
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.status(200).json({
      message: "Upload successful",
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Upload controller error:", error);
    res.status(500).json({ message: "Internal server error during upload" });
  }
};

export const handleMultipleUploads = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const folder = (req.body.folder as string) || "games";
    const uploadPromises = files.map((file) =>
      uploadToCloudinary(file.buffer, folder),
    );

    const results = await Promise.all(uploadPromises);

    res.status(200).json({
      message: "Uploads successful",
      files: results.map((r) => ({
        url: r.secure_url,
        publicId: r.public_id,
      })),
    });
  } catch (error) {
    console.error("Multiple upload controller error:", error);
    res
      .status(500)
      .json({ message: "Internal server error during multiple upload" });
  }
};
