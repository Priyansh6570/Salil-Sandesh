import { NextResponse } from "next/server";
import { isObjectId } from "@/lib/article-id";
import { bffProxy } from "@/lib/bff";

interface RouteContext {
  params: { id: string };
}

function proxyById(request: Request, context: RouteContext): Promise<NextResponse> | NextResponse {
  if (!isObjectId(context.params.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return bffProxy(request, `/admin/articles/${context.params.id}`);
}

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  return proxyById(request, context);
}

export async function PUT(request: Request, context: RouteContext): Promise<NextResponse> {
  return proxyById(request, context);
}

export async function DELETE(request: Request, context: RouteContext): Promise<NextResponse> {
  return proxyById(request, context);
}
