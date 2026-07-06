import type { ErrorRequestHandler } from "express";
import type { ApiError } from "@salil-sandesh/shared";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: "internal server error" } satisfies ApiError);
};
