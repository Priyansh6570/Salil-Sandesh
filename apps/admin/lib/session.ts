import { cookies } from "next/headers";
import { seal, unseal } from "./crypto";

const cookieName = "ss_admin_session";
const maxAgeSeconds = 30 * 86400;

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export function readSession(): SessionTokens | null {
  const cookie = cookies().get(cookieName);
  if (!cookie?.value) {
    return null;
  }
  const tokens = unseal<SessionTokens>(cookie.value);
  return tokens && typeof tokens.accessToken === "string" && typeof tokens.refreshToken === "string"
    ? tokens
    : null;
}

export function writeSession(tokens: SessionTokens): void {
  cookies().set(cookieName, seal(tokens), { ...cookieOptions(), maxAge: maxAgeSeconds });
}

export function clearSession(): void {
  cookies().set(cookieName, "", { ...cookieOptions(), maxAge: 0 });
}
