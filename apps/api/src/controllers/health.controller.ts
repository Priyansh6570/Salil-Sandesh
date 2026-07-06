import type { Request, Response } from "express";
import type { HealthResponse } from "@salil-sandesh/shared";

export function getHealth(_req: Request, res: Response<HealthResponse>): void {
  res.json({ ok: true });
}
