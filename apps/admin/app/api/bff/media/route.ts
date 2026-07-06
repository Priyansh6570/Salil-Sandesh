import { NextResponse } from "next/server";
import { z } from "zod";
import { apiFetch, refreshTokens } from "@/lib/api-proxy";
import { clearSession, readSession, writeSession, type SessionTokens } from "@/lib/session";
import { isExpiringSoon } from "@/lib/jwt";
import { bffProxy } from "@/lib/bff";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

const maxUploadBytes = 8 * 1024 * 1024;

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const query = new URLSearchParams({
    page: parsed.data.page.toString(),
    limit: parsed.data.limit.toString(),
  });
  return bffProxy(request, `/admin/media?${query.toString()}`);
}

async function withFreshTokens(): Promise<SessionTokens | null> {
  let tokens = readSession();
  if (!tokens) {
    return null;
  }
  if (isExpiringSoon(tokens.accessToken)) {
    const rotated = await refreshTokens(tokens);
    if (!rotated) {
      clearSession();
      return null;
    }
    writeSession(rotated);
    tokens = rotated;
  }
  return tokens;
}

export async function POST(request: Request): Promise<NextResponse> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > maxUploadBytes + 1024 * 1024) {
    return NextResponse.json({ error: "file exceeds the size limit" }, { status: 400 });
  }
  const tokens = await withFreshTokens();
  if (!tokens) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file uploaded" }, { status: 400 });
  }
  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "file exceeds the size limit" }, { status: 400 });
  }
  const upstreamForm = new FormData();
  upstreamForm.set("file", file, file.name);
  const alt = form.get("alt");
  if (typeof alt === "string") {
    upstreamForm.set("alt", alt);
  }
  const response = await apiFetch("/admin/media", {
    method: "POST",
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    body: upstreamForm,
  });
  const payload = await response.json().catch(() => ({ error: "upstream error" }));
  return NextResponse.json(payload, { status: response.status });
}
