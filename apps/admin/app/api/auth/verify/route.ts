import { NextResponse } from "next/server";
import { z } from "zod";
import type { TokenPairResponse } from "@salil-sandesh/shared";
import { apiPostJson } from "@/lib/api-proxy";
import { writeSession } from "@/lib/session";

const schema = z.object({
  phone: z.string().regex(/^\+[1-9][0-9]{9,14}$/),
  code: z.string().regex(/^[0-9]{4,10}$/),
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }
  const response = await apiPostJson("/auth/otp/verify", parsed.data);
  if (!response.ok) {
    return NextResponse.json({ error: "invalid phone or code" }, { status: response.status });
  }
  const tokens = (await response.json()) as TokenPairResponse;
  writeSession(tokens);
  return NextResponse.json({ ok: true });
}
