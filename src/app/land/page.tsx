import Link from "next/link";
import { ROAD_PLOTS } from "@/lib/game/land";
export const metadata = { title: "The first plots" };
export default function Land() {
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">ROAD 001 / RELEASE ONE PLAN</span>
        <h1>A place of your own.</h1>
        <p>
          20 proposed home plots along the road. Four central west-side plots
          are reserved for Bane’s courthouse.
        </p>
      </div>
      <section className="paper founding-intro">
        <h2>The first neighborhood.</h2>
        <p>
          Each proposed plot measures 12 × 8 world meters. Green outlines and
          plot IDs are visible in the world. The courthouse civic parcel
          replaces W05–W08; no home plots have been sold or assigned.
        </p>
        <p>
          Bane must approve the first release and each purchase request. The
          planned payment options are cards and crypto on Robinhood Chain.
          Prices, the payment asset and purchase terms will be published before
          sales open. House designs will need their own approval before
          appearing.
        </p>
        <div className="land-actions">
          <Link href="/world">View plots in the world</Link>
          <Link href="/charter">Read the draft founding charter</Link>
        </div>
      </section>
      {(["West", "East"] as const).map((side) => (
        <section key={side} className="land-side">
          <h2>{side} side</h2>
          <div className="land-grid">
            {ROAD_PLOTS.filter((plot) => plot.side === side).map((plot) => (
              <article className="paper plot-card" key={plot.id}>
                <span className="eyebrow">
                  {plot.status === "civic"
                    ? "COURTHOUSE RESERVE"
                    : "PROPOSED PLOT"}
                </span>
                <h3>{plot.id}</h3>
                <p>
                  {plot.width} × {plot.depth} m · {plot.area} m²
                </p>
                <span className="plot-status">
                  {plot.status === "civic"
                    ? "Civic land · not for sale"
                    : "Sale not open"}
                </span>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
