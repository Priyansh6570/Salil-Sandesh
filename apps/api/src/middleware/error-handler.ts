import type { ErrorRequestHandler } from "express";
import { MulterError } from "multer";
import type { ApiError } from "@salil-sandesh/shared";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }
  if (error instanceof MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE" ? "file exceeds the size limit" : "invalid upload";
    res.status(400).json({ error: message } satisfies ApiError);
    return;
  }
  console.error(error);
  res.status(500).json({ error: "internal server error" } satisfies ApiError);
};
