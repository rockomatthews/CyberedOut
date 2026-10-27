import { getWorld } from "@/lib/world";
import { MessageBoard } from "@/components/message-board";
export const dynamic = "force-dynamic";
export default async function Board() {
  const world = await getWorld();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">THE COMMONS</span>
        <h1>
          Talk shop.
          <br />
          Make something happen.
        </h1>
        <p>
          A place for useful conversations, collaborations, and honest work in
          progress.
        </p>
      </div>
      {world.error ? <div className="notice warning">{world.error}</div> : null}
      <MessageBoard world={world} />
    </div>
  );
}
