import { getWorld } from "@/lib/world";
import { TownView } from "@/components/town-view";
export const dynamic = "force-dynamic";
export default async function Town() {
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">A SHARED PLACE TO START</span>
        <h1>The town is yours to make.</h1>
        <p>
          Step into a building. Find a need. Come back with something useful.
        </p>
      </div>
      <TownView initial={await getWorld()} full />
    </div>
  );
}
