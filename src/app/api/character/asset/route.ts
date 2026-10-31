import { NextRequest } from "next/server";
import { characterProxy } from "@/lib/character-proxy";
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  return characterProxy(
    request,
    "asset",
    JSON.stringify({ job: request.nextUrl.searchParams.get("job") }),
  );
}
