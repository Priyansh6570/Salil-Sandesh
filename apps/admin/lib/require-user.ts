import { redirect } from "next/navigation";
import type { MeResponse } from "@salil-sandesh/shared";
import { fetchMe } from "./api-proxy";
import { isExpiringSoon } from "./jwt";
import { readSession } from "./session";

export async function requireUser(nextPath = "/"): Promise<MeResponse> {
  const session = readSession();
  if (!session) {
    redirect("/login");
  }
  if (isExpiringSoon(session.accessToken)) {
    redirect(`/api/auth/refresh?next=${encodeURIComponent(nextPath)}`);
  }
  const me = await fetchMe(session.accessToken);
  if (!me) {
    redirect(`/api/auth/refresh?next=${encodeURIComponent(nextPath)}`);
  }
  return me;
}
