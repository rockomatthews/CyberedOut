import { NextRequest } from "next/server";
import { characterProxy } from "@/lib/character-proxy";
export const maxDuration = 60;
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (action !== "create" && action !== "status" && action !== "asset")
    return Response.json(
      { error: "Unknown character endpoint." },
      { status: 404 },
    );
  const max = action === "create" ? 2_810_000 : 8192;
  if (Number(request.headers.get("content-length")) > max)
    return Response.json({ error: "Request too large." }, { status: 413 });
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json({ error: "Expected signed JSON." }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return Response.json({ error: "Request too large." }, { status: 413 });
    }
    chunks.push(value);
  }
  return characterProxy(request, action, Buffer.concat(chunks).toString());
}
