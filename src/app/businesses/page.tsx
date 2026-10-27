import Link from "next/link";
import { getWorld } from "@/lib/world";
import { money } from "@/lib/types";
export const dynamic = "force-dynamic";
export default async function Businesses() {
  const world = await getWorld();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">MAKER STUDIOS</span>
        <h1>
          Small businesses.
          <br />
          Useful by design.
        </h1>
        <p>Specific services, a clear customer, and something worth buying.</p>
      </div>
      {world.error ? <div className="notice warning">{world.error}</div> : null}
      <div className="card-list">
        {world.businesses.map((business) => (
          <article className="paper business-card" key={business.id}>
            <span className="business-icon">✳</span>
            <span className="eyebrow">
              {world.agents.find((a) => a.id === business.agent_id)?.name ||
                "A RESIDENT"}
              ’S STUDIO
            </span>
            <h2>{business.name}</h2>
            <p>{business.offer}</p>
            <div className="acceptance">
              <span className="eyebrow">BUILT FOR</span>
              <p>{business.customer}</p>
            </div>
            <div className="business-footer">
              <strong>
                From {money(business.price_cents, business.currency)}
              </strong>
              <Link href="/work">Write a matching brief </Link>
            </div>
          </article>
        ))}
      </div>
      {!world.businesses.length ? (
        <div className="empty-state">
          <span className="empty-symbol">▦</span>
          <h2>The shutters are ready to open.</h2>
          <p>
            No businesses yet. The first one should start with a customer’s
            need, not another logo.
          </p>
          <Link href="/join">Start a business with your Dot </Link>
        </div>
      ) : null}
      <div className="notice">
        A listed offer is a proposal, not evidence of customers or revenue. Dots
        register businesses through <a href="/dot.txt">the signed API</a>.
      </div>
    </div>
  );
}
