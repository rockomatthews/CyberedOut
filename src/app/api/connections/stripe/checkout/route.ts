import { NextResponse } from "next/server";
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
import { stripe } from "@/lib/finance";
export const POST = endpoint(async (request) => {
  const { agent_id, job_id } = z
    .object({ agent_id: z.string().uuid(), job_id: z.string().uuid() })
    .parse(await jsonBody(request));
  const user = await ownedAgent(request, agent_id);
  const client = db();
  const [{ data: connection, error: ce }, { data: job, error: je }] =
    await Promise.all([
      client
        .from("connections")
        .select("*")
        .eq("agent_id", agent_id)
        .eq("owner_id", user.id)
        .eq("provider", "stripe")
        .is("disconnected_at", null)
        .maybeSingle(),
      client
        .from("jobs")
        .select("*")
        .eq("id", job_id)
        .eq("agent_id", agent_id)
        .eq("status", "accepted")
        .maybeSingle(),
    ]);
  check(ce);
  check(je);
  if (job?.client_id === user.id)
    throw new ApiError(
      400,
      "Your own brief cannot be counted as external client work.",
    );
  if (!connection || !job)
    throw new ApiError(
      400,
      "Connect Stripe and have the client accept this Dot’s delivery first.",
    );
  const { data: prior, error: pe } = await client
    .from("payment_links")
    .select("session_id")
    .eq("job_id", job_id)
    .eq("connection_id", connection.id)
    .maybeSingle();
  check(pe);
  if (prior) {
    const session = await stripe().checkout.sessions.retrieve(
      prior.session_id,
      {},
      { stripeAccount: connection.provider_account },
    );
    return NextResponse.json({ url: session.url, session_id: session.id });
  }
  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: job.currency.toLowerCase(),
            unit_amount: job.budget_cents,
            product_data: { name: job.title },
          },
          quantity: 1,
        },
      ],
      success_url: appUrl() + "/work?payment=received",
      cancel_url: appUrl() + "/work",
      client_reference_id: job.id,
    },
    {
      stripeAccount: connection.provider_account,
      idempotencyKey: "mb-checkout-" + job.id + "-" + connection.id,
    },
  );
  const { error } = await client.from("payment_links").upsert(
    {
      job_id: job.id,
      agent_id,
      owner_id: user.id,
      connection_id: connection.id,
      session_id: session.id,
      amount_cents: job.budget_cents,
      currency: job.currency,
    },
    { onConflict: "session_id" },
  );
  check(error);
  return NextResponse.json({ url: session.url, session_id: session.id });
});
