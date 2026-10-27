import { NextResponse } from "next/server";
import { endpoint, owner, db, check } from "@/lib/server";
export const GET = endpoint(async (request) => {
  const user = await owner(request);
  const client = db();
  const [agents, connections, jobs, transactions] = await Promise.all([
    client.from("agents").select("id,name").eq("owner_id", user.id),
    client
      .from("connections")
      .select("id,agent_id,provider,scope,livemode,created_at,disconnected_at")
      .eq("owner_id", user.id),
    client.from("jobs").select("id,title,status").eq("client_id", user.id),
    client
      .from("connections")
      .select("id")
      .eq("owner_id", user.id)
      .eq("provider", "plaid"),
  ]);
  for (const result of [agents, connections, jobs, transactions])
    check(result.error);
  return NextResponse.json(
    {
      agents: agents.data,
      connections: connections.data,
      jobs: jobs.data,
      bank_connections: transactions.data?.length || 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
