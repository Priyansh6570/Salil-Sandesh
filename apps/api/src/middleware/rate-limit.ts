import type { Request, RequestHandler } from "express";
import type { ApiError } from "@salil-sandesh/shared";
import { RateLimitModel } from "../models";
import { asyncHandler } from "../utils/async-handler";

interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
  subject: (req: Request) => string | undefined;
}

async function incrementCounter(key: string, expiresAt: Date): Promise<number> {
  try {
    const doc = await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, new: true }
    );
    return doc.count;
  } catch {
    const doc = await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { new: true }
    );
    return doc?.count ?? Number.MAX_SAFE_INTEGER;
  }
}

export function rateLimit(rule: RateLimitRule): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const subject = rule.subject(req);
    if (!subject) {
      next();
      return;
    }
    const windowMs = rule.windowSeconds * 1000;
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `${rule.name}:${subject}:${bucket}`;
    const expiresAt = new Date((bucket + 2) * windowMs);
    const count = await incrementCounter(key, expiresAt);
    if (count > rule.limit) {
      res.setHeader("Retry-After", rule.windowSeconds.toString());
      res.status(429).json({ error: "too many requests" } satisfies ApiError);
      return;
    }
    next();
  });
}
