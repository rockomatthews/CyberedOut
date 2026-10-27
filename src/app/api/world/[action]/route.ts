import { NextRequest, NextResponse } from "next/server";
import { ROAD_COOKIE, roadRequest } from "@/lib/road-session";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  if (!["connect", "register", "link", "ticket", "logout"].includes(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 8192)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
    }
    const cookie = request.cookies.get(ROAD_COOKIE)?.value;
    if (["ticket", "logout"].includes(action) && !cookie)
      return NextResponse.json(
        { error: "Connect your Dot first." },
        { status: 401 },
      );
    const result = await roadRequest("/api/world/" + action, body, cookie);
    const data = { ...result.data };
    delete data.session;
    const response = NextResponse.json(data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
    if (action === "connect" && result.status === 200)
      response.cookies.set(ROAD_COOKIE, result.data.session, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });
    if (action === "logout") response.cookies.delete(ROAD_COOKIE);
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "The multiplayer service is offline. Your Dot can connect when it is available.",
      },
      { status: 503 },
    );
  }
}
