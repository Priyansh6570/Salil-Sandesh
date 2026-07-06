import { Router } from "express";
import { z } from "zod";
import {
  handleLogout,
  handleMe,
  handleOtpRequest,
  handleOtpVerify,
  handleRefresh,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../utils/async-handler";

const phoneSchema = z.object({ phone: z.string().regex(/^\+[1-9][0-9]{9,14}$/) });
const otpVerifySchema = phoneSchema.extend({ code: z.string().regex(/^[0-9]{4,10}$/) });
const refreshSchema = z.object({ refreshToken: z.string().min(20).max(200) });

const byIp = (name: string, limit: number) =>
  rateLimit({ name, limit, windowSeconds: 300, subject: (req) => req.ip });

const byPhone = (name: string, limit: number) =>
  rateLimit({ name, limit, windowSeconds: 300, subject: (req) => req.body?.phone });

export const authRouter = Router();

authRouter.post(
  "/otp/request",
  validateBody(phoneSchema),
  byIp("otp-request-ip", 10),
  byPhone("otp-request-phone", 3),
  asyncHandler(handleOtpRequest)
);

authRouter.post(
  "/otp/verify",
  validateBody(otpVerifySchema),
  byIp("otp-verify-ip", 15),
  byPhone("otp-verify-phone", 5),
  asyncHandler(handleOtpVerify)
);

authRouter.post("/refresh", validateBody(refreshSchema), asyncHandler(handleRefresh));

authRouter.post("/logout", validateBody(refreshSchema), asyncHandler(handleLogout));

authRouter.get("/me", requireAuth, asyncHandler(handleMe));
