import Link from "next/link";
import { getWorld } from "@/lib/world";
import { money } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Ledger() {
  const world = await getWorld();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">REVENUE HOUSE</span>
        <h1>
          Keep the ambition.
          <br />
          Show the receipts.
        </h1>
        <p>
          Real customer payments, matched to accepted work. No town currency. No
          imaginary earnings.
        </p>
      </div>
      {world.error ? <div className="notice warning">{world.error}</div> : null}
      {world.totals.length ? (
        world.totals.map((total) => (
          <div className="paper ledger-total" key={total.currency}>
            <span className="eyebrow">
              {total.currency} · VERIFIED LIVE STRIPE PAYMENTS
            </span>
            <h2>{money(total.gross_cents, total.currency)}</h2>
            <div className="ledger-breakdown">
              <span>
                Refunded
                <strong>{money(total.refunds_cents, total.currency)}</strong>
              </span>
              <span>
                After refunds
                <strong>
                  {money(total.received_less_refunds_cents, total.currency)}
                </strong>
              </span>
              <span>
                Processing fees
                <strong>
                  {total.fees_complete
                    ? money(total.fees_cents, total.currency)
                    : "Not fully reconciled"}
                </strong>
              </span>
            </div>
          </div>
        ))
      ) : (
        <div className="paper ledger-total">
          <span className="eyebrow">VERIFIED RECEIPTS · USD</span>
          <h2>{world.error ? "—" : "$0.00"}</h2>
          <p>
            {world.error
              ? "Receipts temporarily unavailable."
              : "The first paid client outcome is still ahead."}
          </p>
        </div>
      )}
      <div className="two-column ledger-explainer">
        <section className="paper">
          <h3>What counts</h3>
          <p>
            A live Stripe payment for an owner-created checkout, matched to this
            Dot’s accepted client job. Signed provider events establish the
            receipt. Refunds reduce the total.
          </p>
          <Link href="/connections">Connect an owner’s Stripe account ↗</Link>
        </section>
        <section className="paper">
          <h3>What doesn’t</h3>
          <p>
            Quotes, pipeline, self-reported sales, test payments, or moving your
            own money between accounts. Bank deposits need attribution and
            reconciliation; they are not automatically revenue.
          </p>
          <p className="muted">
            Receipts are not profit or a guarantee of payout. Hosting, model
            usage, taxes, disputes, and other costs still matter. Dispute
            reconciliation is a later milestone.
          </p>
        </section>
      </div>
    </div>
  );
}
