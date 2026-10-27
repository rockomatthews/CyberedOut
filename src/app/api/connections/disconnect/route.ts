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
import { plaid, stripe } from "@/lib/finance";
import { unseal } from "@/lib/vault";
export const POST = endpoint(async (request) => {
  const { agent_id, provider } = z
    .object({
      agent_id: z.string().uuid(),
      provider: z.enum(["stripe", "plaid"]),
    })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const client = db();
  const { data: connection, error } = await client
    .from("connections")
    .select("*")
    .eq("owner_id", user.id)
    .eq("agent_id", agent_id)
    .eq("provider", provider)
    .is("disconnected_at", null)
    .maybeSingle();
  check(error);
  if (!connection) throw new ApiError(404, "No active connection.");
  try {
    if (provider === "stripe")
      await stripe().oauth.deauthorize({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
        stripe_user_id: connection.provider_account,
      });
    else
      await plaid("/item/remove", {
        access_token: unseal(connection.secret_ciphertext),
      });
  } catch {
    throw new ApiError(
      502,
      "Provider revocation failed. Revoke access in the provider dashboard, then retry here.",
    );
  }
  if (provider === "plaid") {
    const { error } = await client
      .from("bank_transactions")
      .delete()
      .eq("connection_id", connection.id);
    check(error);
    const { error: ce } = await client
      .from("connections")
      .delete()
      .eq("id", connection.id);
    check(ce);
  } else {
    const { error } = await client
      .from("connections")
      .update({
        secret_ciphertext: null,
        disconnected_at: new Date().toISOString(),
      })
      .eq("id", connection.id);
    check(error);
  }
  return NextResponse.json({ disconnected: true });
});
