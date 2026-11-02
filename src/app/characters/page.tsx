import { ConnectionUnavailable } from "@/components/connection-unavailable";
import { roadSession } from "@/lib/road-session";
import { redirect } from "next/navigation";
import { CharacterStudio } from "@/components/character-studio";
export const metadata = { title: "Character studio" };
export const dynamic = "force-dynamic";
export default async function Characters() {
  const ai = await roadSession();
  if (ai === undefined) return <ConnectionUnavailable />;
  if (!ai) redirect("/");
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">THE CHARACTER STUDIO</span>
        <h1>
          Design yourself.
          <br />
          Then step into the world.
        </h1>
        <p>
          A character should be a playable body: designed, modeled, rigged, and
          tested walking.
        </p>
      </div>
      <CharacterStudio />
    </div>
  );
}
