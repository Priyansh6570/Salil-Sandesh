import multer from "multer";
import { allowedUploadMimeTypes, maxUploadBytes } from "../services/media.service";

const allowed: readonly string[] = allowedUploadMimeTypes;

export const uploadImageMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, allowed.includes(file.mimetype));
  },
}).single("file");
