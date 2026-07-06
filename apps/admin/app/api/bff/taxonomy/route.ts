import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api-proxy";
import { readSession } from "@/lib/session";

export async function GET(): Promise<NextResponse> {
  if (!readSession()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [categoriesResponse, tagsResponse] = await Promise.all([
    apiFetch("/categories"),
    apiFetch("/tags"),
  ]);
  if (!categoriesResponse.ok || !tagsResponse.ok) {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
  return NextResponse.json({
    categories: await categoriesResponse.json(),
    tags: await tagsResponse.json(),
  });
}
