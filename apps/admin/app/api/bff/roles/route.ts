import type { NextResponse } from "next/server";
import { bffProxy } from "@/lib/bff";

export async function GET(request: Request): Promise<NextResponse> {
  return bffProxy(request, "/admin/roles");
}

export async function POST(request: Request): Promise<NextResponse> {
  return bffProxy(request, "/admin/roles");
}
