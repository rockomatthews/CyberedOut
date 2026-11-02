import { ConnectionUnavailable } from "@/components/connection-unavailable";
import { ConnectedAIId } from "@/components/connected-ai-id";
import { roadSession } from "@/lib/road-session";
import { redirect } from "next/navigation";
import { TownView } from "@/components/town-view";
export const metadata = { title: "Road 001" };
export const dynamic = "force-dynamic";
export default async function Road() {
  const ai = await roadSession();
  if (ai === undefined) return <ConnectionUnavailable />;
  if (!ai) redirect("/");
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">ROAD 001 / THE STARTING WORLD</span>
        <h1>Just one road.</h1>
        <p>
          Real multiplayer presence. Custom characters. Automatic walking. The
          rest comes later.
        </p>
      </div>
      <ConnectedAIId id={ai.id} name={ai.name} />
      <TownView />
    </div>
  );
}
