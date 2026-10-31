import { NextRequest } from "next/server";
import { characterProxy } from "@/lib/character-proxy";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  return characterProxy(request, "status");
}
export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return Response.json({ error: "Expected JSON." }, { status: 415 });
  if (Number(request.headers.get("content-length")) > 2_810_000)
    return Response.json(
      { error: "Use an image up to 2 MB." },
      { status: 413 },
    );
  const reader = request.body?.getReader();
  if (!reader)
    return Response.json(
      { error: "Choose a character image." },
      { status: 400 },
    );
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 2_810_000) {
      await reader.cancel();
      return Response.json(
        { error: "Use an image up to 2 MB." },
        { status: 413 },
      );
    }
    chunks.push(value);
  }
  return characterProxy(request, "create", Buffer.concat(chunks).toString());
}
