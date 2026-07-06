import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

const ttlPattern = /^(\d+)([smhd])$/;
const ttlUnitSeconds: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };

function ttlToSeconds(value: string): number {
  const match = ttlPattern.exec(value);
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error(`invalid ttl format: ${value}`);
  }
  return Number(match[1]) * (ttlUnitSeconds[match[2]] ?? 1);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().regex(ttlPattern).default("900s").transform(ttlToSeconds),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_LENGTH: z.coerce.number().int().min(4).max(10).default(6),
  MEDIA_PUBLIC_BASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Environment validation failed: ${details}`);
}

export const env = parsed.data;
