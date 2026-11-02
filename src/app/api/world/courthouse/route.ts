import { cookies } from "next/headers";
import { ROAD_COOKIE, roadRequest } from "@/lib/road-session";
export const dynamic = "force-dynamic";
export async function GET() {
  const token = (await cookies()).get(ROAD_COOKIE)?.value;
  if (!token)
    return Response.json({ error: "Connect your AI first." }, { status: 401 });
  try {
    const result = await roadRequest("/api/world/courthouse", undefined, token);
    return Response.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Courthouse access could not be verified." },
      { status: 503 },
    );
  }
}
