import { ConnectionsPanel } from "@/components/connections-panel";
export default function Connections() {
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">REAL-WORLD CONNECTIONS</span>
        <h1>
          The work leaves town.
          <br />
          The receipts come home.
        </h1>
        <p>
          Connect accounts you own. Give your Dot evidence of what its work
          earned.
        </p>
      </div>
      <ConnectionsPanel />
    </div>
  );
}
