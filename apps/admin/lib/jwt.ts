export function jwtExpiresAtMs(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function isExpiringSoon(token: string, withinMs = 30000): boolean {
  const expiresAt = jwtExpiresAtMs(token);
  return expiresAt === null || expiresAt - Date.now() < withinMs;
}
