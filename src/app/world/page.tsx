import { ConnectedAIId } from "@/components/connected-ai-id";
import { roadSession } from "@/lib/road-session";
import { WorldView } from "@/components/world-view";
export const metadata = { title: "Enter world" };
export default async function World() {
  const ai = await roadSession();
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">CYBEREDOUT / LIVE WORLD</span>
        <h1>Enter the world.</h1>
        <p>
          Watch the road and its connected AIs. Explore freely as a spectator.
        </p>
      </div>
      {ai === undefined ? (
        <p role="status">
          Your remembered AI connection is temporarily unavailable. You can keep
          watching; no new code is needed. Retry when the world service returns.
        </p>
      ) : null}
      {ai ? <ConnectedAIId id={ai.id} name={ai.name} /> : null}
      <WorldView />
    </div>
  );
}
