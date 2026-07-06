import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { ApiError, Permission } from "@salil-sandesh/shared";
import { env } from "../config/env";
import { resolveUserAccess } from "../services/permission.service";
import { asyncHandler } from "../utils/async-handler";

export function authUserId(req: Request): string | undefined {
  return (req as Request & { authUserId?: string }).authUserId;
}

function setAuthUserId(req: Request, userId: string): void {
  (req as Request & { authUserId?: string }).authUserId = userId;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      res.status(401).json({ error: "unauthorized" } satisfies ApiError);
      return;
    }
    setAuthUserId(req, payload.sub);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
  }
};

export function requirePermissions(...permissions: Permission[]): RequestHandler {
  return asyncHandler(async (req, res, next) => {
    const userId = authUserId(req);
    if (!userId) {
      res.status(401).json({ error: "unauthorized" } satisfies ApiError);
      return;
    }
    const access = await resolveUserAccess(userId);
    if (!access) {
      res.status(401).json({ error: "unauthorized" } satisfies ApiError);
      return;
    }
    const granted = new Set(access.permissions);
    if (!permissions.every((permission) => granted.has(permission))) {
      res.status(403).json({ error: "forbidden" } satisfies ApiError);
      return;
    }
    next();
  });
}
