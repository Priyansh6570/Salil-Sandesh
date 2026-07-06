import type { Request, Response } from "express";
import type { ApiError, MeResponse, OtpRequestAck, TokenPairResponse } from "@salil-sandesh/shared";
import { authUserId } from "../middleware/auth";
import { resolveUserAccess } from "../services/permission.service";
import { requestOtp, verifyOtp } from "../services/otp.service";
import {
  issueTokenPair,
  revokeByRefreshToken,
  rotateTokenPair,
} from "../services/token.service";

const otpAck: OtpRequestAck = { message: "if the phone is registered, a code has been sent" };

export async function handleOtpRequest(req: Request, res: Response<OtpRequestAck>): Promise<void> {
  await requestOtp(req.body.phone);
  res.json(otpAck);
}

export async function handleOtpVerify(req: Request, res: Response): Promise<void> {
  const userId = await verifyOtp(req.body.phone, req.body.code);
  if (!userId) {
    res.status(401).json({ error: "invalid phone or code" } satisfies ApiError);
    return;
  }
  const pair: TokenPairResponse = await issueTokenPair(userId);
  res.json(pair);
}

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const pair = await rotateTokenPair(req.body.refreshToken);
  if (!pair) {
    res.status(401).json({ error: "invalid refresh token" } satisfies ApiError);
    return;
  }
  res.json(pair);
}

export async function handleLogout(req: Request, res: Response): Promise<void> {
  await revokeByRefreshToken(req.body.refreshToken);
  res.json({ ok: true });
}

export async function handleMe(req: Request, res: Response): Promise<void> {
  const userId = authUserId(req);
  const access: MeResponse | null = userId ? await resolveUserAccess(userId) : null;
  if (!access) {
    res.status(401).json({ error: "unauthorized" } satisfies ApiError);
    return;
  }
  res.json(access);
}
