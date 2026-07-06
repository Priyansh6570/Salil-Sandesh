import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { adminEnv } from "./env";

const version = "v1";
const ivLength = 12;
const tagLength = 16;

function sealKey(): Buffer {
  return createHash("sha256").update(adminEnv.sessionSecret).digest();
}

export function seal(payload: unknown): string {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload), "utf8")),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${version}.${Buffer.concat([iv, encrypted, tag]).toString("base64url")}`;
}

export function unseal<T>(sealed: string): T | null {
  try {
    const [sealedVersion, data] = sealed.split(".");
    if (sealedVersion !== version || !data) {
      return null;
    }
    const raw = Buffer.from(data, "base64url");
    if (raw.length < ivLength + tagLength) {
      return null;
    }
    const iv = raw.subarray(0, ivLength);
    const tag = raw.subarray(raw.length - tagLength);
    const encrypted = raw.subarray(ivLength, raw.length - tagLength);
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}
