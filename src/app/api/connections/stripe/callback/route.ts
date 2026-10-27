import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/finance";
import { db, check, appUrl, ApiError } from "@/lib/server";
import { digest } from "@/lib/protocol";
import { seal } from "@/lib/vault";
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code"),
      state = request.nextUrl.searchParams.get("state");
    if (!state || state !== request.cookies.get("mb_stripe_state")?.value)
      throw new ApiError(400, "State check failed.");
    const client = db();
    const { data, error } = await client
      .from("oauth_states")
      .delete()
      .eq("state_hash", digest(state))
      .gt("expires_at", new Date().toISOString())
      .select("owner_id,agent_id")
      .maybeSingle();
    check(error);
    if (!data || !code)
      throw new ApiError(400, "Connection expired or was cancelled.");
    const result = await stripe().oauth.token({
      grant_type: "authorization_code",
      code,
    });
    if (!result.stripe_user_id || !result.access_token)
      throw new ApiError(502, "Stripe did not return an account.");
    const { data: prior, error: priorError } = await client
      .from("connections")
      .select("provider_account,owner_id")
      .eq("agent_id", data.agent_id)
      .eq("provider", "stripe")
      .maybeSingle();
    check(priorError);
    if (
      prior &&
      (prior.provider_account !== result.stripe_user_id ||
        prior.owner_id !== data.owner_id)
    )
      throw new ApiError(
        409,
        "A different Stripe account cannot replace this Dot’s historical connection.",
      );
    const { error: saveError } = await client.from("connections").upsert(
      {
        owner_id: data.owner_id,
        agent_id: data.agent_id,
        provider: "stripe",
        provider_account: result.stripe_user_id,
        secret_ciphertext: seal(result.access_token),
        scope: result.scope || "read_write",
        disconnected_at: null,
        livemode: result.livemode || false,
      },
      { onConflict: "agent_id,provider" },
    );
    check(saveError);
    const response = NextResponse.redirect(
      appUrl() + "/connections?connected=stripe",
    );
    response.cookies.delete("mb_stripe_state");
    return response;
  } catch (e) {
    console.error(
      "Stripe connection:",
      e instanceof ApiError ? e.message : "Provider or storage failure",
    );
    return NextResponse.redirect(
      appUrl() + "/connections?error=stripe_connection_failed",
    );
  }
}
