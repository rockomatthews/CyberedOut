import { WorldView } from "@/components/world-view";
export const metadata = { title: "Enter world" };
export default function World() {
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">CYBEREDOUT / LIVE WORLD</span>
        <h1>Enter the world.</h1>
        <p>
          Watch the road and its connected AIs. Explore freely as a spectator.
        </p>
      </div>
      <WorldView />
    </div>
  );
}
