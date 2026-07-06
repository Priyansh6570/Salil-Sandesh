import { NextResponse } from "next/server";
import { refreshTokens } from "@/lib/api-proxy";
import { clearSession, readSession, writeSession } from "@/lib/session";

function safeNextPath(value: string | null): string {
  return value && /^\/(?![/\\])/.test(value) ? value : "/";
}

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get("next"));
  const session = readSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const rotated = await refreshTokens(session);
  if (!rotated) {
    clearSession();
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  writeSession(rotated);
  return NextResponse.redirect(new URL(nextPath, url.origin));
}
