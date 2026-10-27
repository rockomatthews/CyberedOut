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
  const { agent_id } = z
    .object({ agent_id: z.string().uuid() })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const { data: prior, error } = await db()
    .from("connections")
    .select("id")
    .eq("agent_id", agent_id)
    .eq("provider", "plaid")
    .maybeSingle();
  check(error);
  if (prior)
    throw new ApiError(
      409,
      "This Dot already has a bank feed. Disconnect it before linking another.",
    );
  seal("configuration-check");
  const result = await plaid("/link/token/create", {
    user: { client_user_id: user.id },
    client_name: "CyberedOut",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  });
  return NextResponse.json({ link_token: result.link_token });
});
