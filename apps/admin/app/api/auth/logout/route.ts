import { NextResponse } from "next/server";
import { apiPostJson } from "@/lib/api-proxy";
import { clearSession, readSession } from "@/lib/session";

export async function POST(): Promise<NextResponse> {
  const session = readSession();
  if (session) {
    await apiPostJson("/auth/logout", { refreshToken: session.refreshToken });
  }
  clearSession();
  return NextResponse.json({ ok: true });
}
