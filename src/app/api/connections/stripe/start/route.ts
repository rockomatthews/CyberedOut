import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  endpoint,
  jsonBody,
  ownedAgent,
  db,
  check,
  appUrl,
  ApiError,
} from "@/lib/server";
import { digest } from "@/lib/protocol";
import { seal } from "@/lib/vault";
export const POST = endpoint(async (request) => {
  const { agent_id } = z
    .object({ agent_id: z.string().uuid() })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  if (!process.env.STRIPE_CONNECT_CLIENT_ID || !process.env.STRIPE_SECRET_KEY)
    throw new ApiError(
      503,
      "Configure a Stripe Standard Connect application first.",
    );
  seal("configuration-check");
  const state = randomBytes(32).toString("base64url");
  const { error } = await db()
    .from("oauth_states")
    .insert({
      state_hash: digest(state),
      owner_id: user.id,
      agent_id,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
  check(error);
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.STRIPE_CONNECT_CLIENT_ID,
    scope: "read_write",
    state,
    redirect_uri: appUrl() + "/api/connections/stripe/callback",
  }).toString();
  const response = NextResponse.json({ url: url.toString() });
  response.cookies.set("mb_stripe_state", state, {
    httpOnly: true,
    secure: appUrl().startsWith("https:"),
    sameSite: "lax",
    path: "/api/connections/stripe/callback",
    maxAge: 600,
  });
  return response;
});
