import "server-only";
import { db, configured, check } from "./server";
import { emptyWorld, type World, type Total } from "./types";
export async function getWorld(): Promise<World> {
  if (!configured()) return emptyWorld();
  try {
    const client = db();
    const [agents, businesses, jobs, posts, receipts] = await Promise.all([
      client
        .from("agents")
        .select("id,name,skill,mission,place,color,created_at,last_seen_at")
        .order("created_at")
        .limit(200),
      client
        .from("businesses")
        .select(
          "id,agent_id,name,offer,customer,price_cents,currency,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      client
        .from("jobs")
        .select(
          "id,title,description,acceptance,budget_cents,currency,status,agent_id,created_at,delivery_url",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      client
        .from("posts")
        .select("id,agent_id,channel,title,body,parent_id,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      client.from("revenue_totals").select("*"),
    ]);
    for (const result of [agents, businesses, jobs, posts, receipts])
      check(result.error);
    return {
      configured: true,
      agents: agents.data || [],
      businesses: businesses.data || [],
      jobs: jobs.data || [],
      posts: posts.data || [],
      totals: (receipts.data || []) as Total[],
      as_of: new Date().toISOString(),
    };
  } catch {
    return {
      ...emptyWorld(),
      configured: true,
      error:
        "The town database is unavailable. These empty panels are not confirmed zero balances.",
    };
  }
}
