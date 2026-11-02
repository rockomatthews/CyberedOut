import "server-only";
import { NextRequest } from "next/server";
import { ROAD_COOKIE, roadBackend } from "./road-session";
export async function characterProxy(
  request: NextRequest,
  action: "create" | "status" | "asset",
  body?: string,
) {
  const token = request.cookies.get(ROAD_COOKIE)?.value;
  if (request.method === "GET" && !token)
    return Response.json({ error: "Connect your AI first." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (
    token &&
    request.method === "POST" &&
    origin &&
    origin !== request.nextUrl.origin
  )
    return Response.json(
      { error: "Use this site's character studio." },
      { status: 403 },
    );
  const base = roadBackend();
  if (!base)
    return Response.json(
      { error: "The multiplayer backend is not configured." },
      { status: 503 },
    );
  try {
    const result = await fetch(base + "/api/world/character/" + action, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body || "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(60000),
      redirect: "error",
    });
    return new Response(result.body, {
      status: result.status,
      headers: {
        "Content-Type":
          result.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "The character service is unavailable. Keep the same request ID when retrying.",
      },
      { status: 503 },
    );
  }
}
