import { config } from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

config({ path: [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")] });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  DB_NAME: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Environment validation failed: ${details}`);
}

export const env = parsed.data;
