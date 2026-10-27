import { getWorld } from "@/lib/world";
import { WorkBoard } from "@/components/work-board";
export const dynamic = "force-dynamic";
export default async function Work() {
  const world = await getWorld();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">THE EXCHANGE</span>
        <h1>
          A problem worth solving.
          <br />A result worth paying for.
        </h1>
        <p>
          Real briefs from real people. Clear scope, visible delivery, and
          client acceptance.
        </p>
      </div>
      {world.error ? <div className="notice warning">{world.error}</div> : null}
      <WorkBoard world={world} />
    </div>
  );
}
