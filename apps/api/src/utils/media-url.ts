import { env } from "../config/env";

export function mediaUrlFromKey(key: string): string {
  const base = env.MEDIA_PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/${key.replace(/^\/+/, "")}`;
}
