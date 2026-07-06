import { randomBytes, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import type { TokenPairResponse } from "@salil-sandesh/shared";
import { env } from "../config/env";
import { RefreshTokenModel, UserModel } from "../models";
import { sha256Hex } from "../utils/hash";

function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.JWT_ACCESS_TTL,
    algorithm: "HS256",
  });
}

async function issueRefreshToken(userId: string, familyId: string): Promise<string> {
  const token = randomBytes(48).toString("base64url");
  await RefreshTokenModel.create({
    userId,
    familyId,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(Date.now() + env.REFRESH_TTL_DAYS * 86400000),
  });
  return token;
}

async function revokeFamily(familyId: string): Promise<void> {
  await RefreshTokenModel.updateMany(
    { familyId, status: { $ne: "revoked" } },
    { status: "revoked" }
  );
}

export async function issueTokenPair(userId: string): Promise<TokenPairResponse> {
  const refreshToken = await issueRefreshToken(userId, randomUUID());
  return { accessToken: signAccessToken(userId), refreshToken };
}

export async function rotateTokenPair(refreshToken: string): Promise<TokenPairResponse | null> {
  const record = await RefreshTokenModel.findOne({ tokenHash: sha256Hex(refreshToken) });
  if (!record) {
    return null;
  }
  if (record.status !== "active" || record.expiresAt.getTime() <= Date.now()) {
    await revokeFamily(record.familyId);
    return null;
  }
  const user = await UserModel.findById(record.userId);
  if (!user || user.status !== "active") {
    await revokeFamily(record.familyId);
    return null;
  }
  const rotated = await RefreshTokenModel.findOneAndUpdate(
    { _id: record._id, status: "active" },
    { status: "rotated" },
    { new: true }
  );
  if (!rotated) {
    await revokeFamily(record.familyId);
    return null;
  }
  const userId = record.userId.toString();
  const newRefreshToken = await issueRefreshToken(userId, record.familyId);
  return { accessToken: signAccessToken(userId), refreshToken: newRefreshToken };
}

export async function revokeByRefreshToken(refreshToken: string): Promise<void> {
  const record = await RefreshTokenModel.findOne({ tokenHash: sha256Hex(refreshToken) });
  if (record) {
    await revokeFamily(record.familyId);
  }
}
