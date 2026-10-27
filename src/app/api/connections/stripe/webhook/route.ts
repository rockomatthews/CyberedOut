import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/finance";
import { db, check } from "@/lib/server";
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      secret,
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 },
    );
  }
  try {
    const client = db();
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const payload = event.data.object as Stripe.Checkout.Session;
      const { data: link, error } = await client
        .from("payment_links")
        .select("id,amount_cents,currency,connection_id")
        .eq("session_id", payload.id)
        .maybeSingle();
      check(error);
      // Unmapped payments must never become a Dot’s claimed earnings. A retry can reconcile a race with link saving.
      if (!link)
        return NextResponse.json(
          { error: "Awaiting mapped checkout session" },
          { status: 503 },
        );
      const { data: connection, error: ce } = await client
        .from("connections")
        .select("provider_account,livemode")
        .eq("id", link.connection_id)
        .single();
      check(ce);
      if (!event.account || event.account !== connection?.provider_account)
        return NextResponse.json(
          { error: "Account mismatch" },
          { status: 400 },
        );
      const session = await stripe().checkout.sessions.retrieve(
        payload.id,
        { expand: ["payment_intent.latest_charge.balance_transaction"] },
        { stripeAccount: event.account },
      );
      if (session.payment_status !== "paid")
        return NextResponse.json({ received: true, pending: true });
      if (
        session.amount_total !== link.amount_cents ||
        session.currency?.toUpperCase() !== link.currency
      )
        return NextResponse.json(
          { error: "Payment terms mismatch" },
          { status: 400 },
        );
      const intent = session.payment_intent as Stripe.PaymentIntent;
      const charge = intent.latest_charge as Stripe.Charge;
      if (!charge?.id || !charge.paid) throw new Error("Charge not settled");
      const balance =
        typeof charge.balance_transaction === "object"
          ? charge.balance_transaction
          : null;
      // Insert-once: delayed checkout retries must never overwrite a later refund.
      const { error: save } = await client.from("payment_receipts").upsert(
        {
          payment_link_id: link.id,
          provider_charge_id: charge.id,
          gross_cents: charge.amount,
          refunds_cents: charge.amount_refunded,
          fees_cents: balance?.fee ?? null,
          currency: charge.currency.toUpperCase(),
          livemode: event.livemode && Boolean(connection?.livemode),
        },
        { onConflict: "provider_charge_id", ignoreDuplicates: true },
      );
      check(save);
    } else if (event.type === "charge.refunded") {
      const payload = event.data.object as Stripe.Charge;
      const { data: receipt, error: re } = await client
        .from("payment_receipts")
        .select("id,payment_link_id")
        .eq("provider_charge_id", payload.id)
        .maybeSingle();
      check(re);
      if (receipt) {
        const { data: link, error: le } = await client
          .from("payment_links")
          .select("connection_id")
          .eq("id", receipt.payment_link_id)
          .single();
        check(le);
        const { data: connection, error: ce } = await client
          .from("connections")
          .select("provider_account")
          .eq("id", link!.connection_id)
          .single();
        check(ce);
        if (connection?.provider_account !== event.account)
          return NextResponse.json(
            { error: "Account mismatch" },
            { status: 400 },
          );
        const latest = await stripe().charges.retrieve(
          payload.id,
          {},
          { stripeAccount: event.account! },
        );
        const { error } = await client
          .from("payment_receipts")
          .update({
            refunds_cents: latest.amount_refunded,
            verified_at: new Date().toISOString(),
          })
          .eq("id", receipt.id)
          .lte("refunds_cents", latest.amount_refunded);
        check(error);
      } else
        return NextResponse.json(
          { error: "Awaiting original charge receipt" },
          { status: 503 },
        );
    }
    return NextResponse.json({ received: true });
  } catch {
    console.error("Stripe reconciliation failed for event", event.id);
    return NextResponse.json(
      { error: "Reconciliation failed; retry this event." },
      { status: 503 },
    );
  }
}
