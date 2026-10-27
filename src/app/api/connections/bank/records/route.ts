import { NextResponse } from "next/server";
import { z } from "zod";
import {
  endpoint,
  jsonBody,
  ownedAgent,
  db,
  check,
  ApiError,
} from "@/lib/server";
export const POST = endpoint(async (request) => {
  const { agent_id } = z
    .object({ agent_id: z.string().uuid() })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const client = db();
  const { data: connection, error } = await client
    .from("connections")
    .select("id")
    .eq("owner_id", user.id)
    .eq("agent_id", agent_id)
    .eq("provider", "plaid")
    .is("disconnected_at", null)
    .maybeSingle();
  check(error);
  if (!connection) throw new ApiError(404, "No connected bank.");
  const { data, error: te } = await client
    .from("bank_transactions")
    .select("amount,currency,description,posted_on,pending")
    .eq("connection_id", connection.id)
    .order("posted_on", { ascending: false })
    .limit(100);
  check(te);
  return NextResponse.json(
    { transactions: data },
    { headers: { "Cache-Control": "no-store" } },
  );
});
