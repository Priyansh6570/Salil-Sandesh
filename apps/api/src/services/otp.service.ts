import { randomInt, randomUUID } from "node:crypto";
import { env } from "../config/env";
import { OtpModel, UserModel } from "../models";
import { constantTimeEqualHex, hmacSha256Hex } from "../utils/hash";

const maxVerifyAttempts = 5;

function otpHash(value: string): string {
  return hmacSha256Hex(env.JWT_ACCESS_SECRET, `otp:${value}`);
}

function generateCode(): string {
  return randomInt(0, 10 ** env.OTP_LENGTH)
    .toString()
    .padStart(env.OTP_LENGTH, "0");
}

async function storeOtp(phone: string, codeHash: string): Promise<void> {
  const update = {
    codeHash,
    expiresAt: new Date(Date.now() + env.OTP_TTL_SECONDS * 1000),
    attempts: 0,
  };
  try {
    await OtpModel.findOneAndUpdate({ phone }, update, { upsert: true });
  } catch {
    await OtpModel.findOneAndUpdate({ phone }, update);
  }
}

export async function requestOtp(phone: string): Promise<void> {
  const user = await UserModel.findOne({ phone, status: "active" });
  const code = generateCode();
  if (!user) {
    await storeOtp(phone, otpHash(`decoy:${randomUUID()}`));
    return;
  }
  await storeOtp(phone, otpHash(code));
  console.log(`[otp] delivery for ${phone}: ${code}`);
}

export async function verifyOtp(phone: string, code: string): Promise<string | null> {
  const codeHash = otpHash(code);
  const decoyHash = otpHash(`missing:${phone}`);
  const otp = await OtpModel.findOneAndUpdate(
    { phone, expiresAt: { $gt: new Date() }, attempts: { $lt: maxVerifyAttempts } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  const matches = constantTimeEqualHex(codeHash, otp?.codeHash ?? decoyHash);
  if (!otp || !matches) {
    return null;
  }
  const user = await UserModel.findOne({ phone, status: "active" });
  if (!user) {
    return null;
  }
  await OtpModel.deleteOne({ _id: otp._id });
  return user.id;
}
