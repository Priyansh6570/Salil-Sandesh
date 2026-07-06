import { NextResponse } from "next/server";
import { apiFetch, refreshTokens } from "./api-proxy";
import { isExpiringSoon } from "./jwt";
import { clearSession, readSession, writeSession, type SessionTokens } from "./session";

function unauthorized(): NextResponse {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function authorizedInit(
  method: string,
  accessToken: string,
  body: string | undefined
): RequestInit {
  return {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
    ...(body !== undefined ? { body } : {}),
  };
}

async function rotateSession(tokens: SessionTokens): Promise<SessionTokens | null> {
  const rotated = await refreshTokens(tokens);
  if (!rotated) {
    clearSession();
    return null;
  }
  writeSession(rotated);
  return rotated;
}

export async function bffProxy(request: Request, apiPath: string): Promise<NextResponse> {
  let tokens = readSession();
  if (!tokens) {
    return unauthorized();
  }
  if (isExpiringSoon(tokens.accessToken)) {
    tokens = await rotateSession(tokens);
    if (!tokens) {
      return unauthorized();
    }
  }
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;
  let response = await apiFetch(apiPath, authorizedInit(request.method, tokens.accessToken, body));
  if (response.status === 401) {
    tokens = await rotateSession(tokens);
    if (!tokens) {
      return unauthorized();
    }
    response = await apiFetch(apiPath, authorizedInit(request.method, tokens.accessToken, body));
  }
  const payload = await response.json().catch(() => ({ error: "upstream error" }));
  return NextResponse.json(payload, { status: response.status });
}
