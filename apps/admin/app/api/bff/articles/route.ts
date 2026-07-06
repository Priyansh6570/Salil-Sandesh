import { NextResponse } from "next/server";
import { z } from "zod";
import { bffProxy } from "@/lib/bff";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["draft", "published"]).optional(),
});

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid query" }, { status: 400 });
  }
  const query = new URLSearchParams({
    page: parsed.data.page.toString(),
    limit: parsed.data.limit.toString(),
  });
  if (parsed.data.status) {
    query.set("status", parsed.data.status);
  }
  return bffProxy(request, `/admin/articles?${query.toString()}`);
}

export async function POST(request: Request): Promise<NextResponse> {
  return bffProxy(request, "/admin/articles");
}
