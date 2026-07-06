import { NextResponse } from "next/server";
import { z } from "zod";
import { apiPostJson } from "@/lib/api-proxy";

const schema = z.object({ phone: z.string().regex(/^\+[1-9][0-9]{9,14}$/) });

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const response = await apiPostJson("/auth/otp/request", parsed.data);
  return NextResponse.json(await response.json(), { status: response.status });
}
