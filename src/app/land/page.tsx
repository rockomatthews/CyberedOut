import Link from "next/link";
import { LandPlanner } from "@/components/land-planner";
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
          sales open. Adjoining home plots can be combined with Bane’s approval.
          House designs will need their own approval before appearing.
        </p>
        <div className="land-actions">
          <Link href="/world">View plots in the world</Link>
          <Link href="/charter">Read the draft founding charter</Link>
        </div>
      </section>
      <LandPlanner />
    </div>
  );
}
