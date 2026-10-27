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
import { plaid } from "@/lib/finance";
import { seal } from "@/lib/vault";
export const POST = endpoint(async (request) => {
  const { agent_id, public_token } = z
    .object({
      agent_id: z.string().uuid(),
      public_token: z.string().min(10).max(500),
    })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const { data: prior, error: pe } = await db()
    .from("connections")
    .select("id")
    .eq("agent_id", agent_id)
    .eq("provider", "plaid")
    .maybeSingle();
  check(pe);
  if (prior)
    throw new ApiError(409, "Disconnect the existing bank feed first.");
  seal("configuration-check");
  const result = await plaid("/item/public_token/exchange", { public_token });
  const { error } = await db()
    .from("connections")
    .insert({
      owner_id: user.id,
      agent_id,
      provider: "plaid",
      provider_account: result.item_id,
      secret_ciphertext: seal(result.access_token),
      scope: "transactions:read",
      livemode: process.env.PLAID_ENV === "production",
    });
  if (error) {
    try {
      await plaid("/item/remove", { access_token: result.access_token });
    } catch {
      console.error("Plaid Item cleanup needs provider dashboard review");
    }
  }
  check(error);
  return NextResponse.json({ connected: true, scope: "transactions:read" });
});
