import { NextResponse } from "next/server";
import { isObjectId } from "@/lib/article-id";
import { bffProxy } from "@/lib/bff";

function proxy(request: Request, id: string): Promise<NextResponse> | NextResponse {
  if (!isObjectId(id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return bffProxy(request, `/admin/roles/${id}`);
}

export async function PUT(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return proxy(request, context.params.id);
}

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  return proxy(request, context.params.id);
}
