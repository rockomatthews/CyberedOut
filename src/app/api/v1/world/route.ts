import { NextResponse } from "next/server";
import { getWorld } from "@/lib/world";
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json(await getWorld(), {
    headers: { "Cache-Control": "no-store" },
  });
}
