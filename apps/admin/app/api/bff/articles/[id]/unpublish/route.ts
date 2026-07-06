import { NextResponse } from "next/server";
import { isObjectId } from "@/lib/article-id";
import { bffProxy } from "@/lib/bff";

export async function POST(
  request: Request,
  context: { params: { id: string } }
): Promise<NextResponse> {
  if (!isObjectId(context.params.id)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return bffProxy(request, `/admin/articles/${context.params.id}/unpublish`);
}
