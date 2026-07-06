import type { MeResponse, TokenPairResponse } from "@salil-sandesh/shared";
import { adminEnv } from "./env";
import type { SessionTokens } from "./session";

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${adminEnv.apiUrl}${path}`, { ...init, cache: "no-store" });
}

export function apiPostJson(path: string, body: unknown): Promise<Response> {
  return apiFetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function refreshTokens(tokens: SessionTokens): Promise<SessionTokens | null> {
  const response = await apiPostJson("/auth/refresh", { refreshToken: tokens.refreshToken });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as TokenPairResponse;
}

export async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  const response = await apiFetch("/auth/me", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as MeResponse;
}
