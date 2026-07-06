import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import type { ApiError } from "@salil-sandesh/shared";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid request body" } satisfies ApiError);
      return;
    }
    req.body = parsed.data;
    next();
  };
}
