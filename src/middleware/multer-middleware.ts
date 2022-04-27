import multer from "multer";
import type { Request } from "express";
import path from "path";

const storage: multer.StorageEngine = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { files: 1 },
  fileFilter(
    req: Request,
    file: Express.Multer.File,
    callback: multer.FileFilterCallback
  ) {
    if (path.extname(file.originalname) === ".torrent") {
      callback(null, true);
    } else {
      callback(new Error("not a torrent file"));
    }
  },
});

export default upload;
