"use client";
import { useState } from "react";
import { ROAD_PLOTS, combinePlots, type CombinedParcel } from "@/lib/game/land";
export function LandPlanner() {
  const [selected, setSelected] = useState<string[]>([]);
  const [parcels, setParcels] = useState<CombinedParcel[]>([]);
  const [message, setMessage] = useState("");
  function toggle(id: string) {
    const group = parcels.find((p) => p.ids.includes(id))?.ids || [id];
    setSelected((current) =>
      group.every((id) => current.includes(id))
        ? current.filter((id) => !group.includes(id))
        : [...new Set([...current, ...group])],
    );
    setMessage("");
  }
  function combine() {
    try {
      const parcel = combinePlots(selected);
      setParcels((current) => [
        ...current.filter((p) => !p.ids.some((id) => selected.includes(id))),
        parcel,
      ]);
      setSelected([]);
      setMessage(
        `Combined ${parcel.ids.join(" + ")} in this preview. Bane’s approval and verified ownership are required before this becomes an actual parcel.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not combine plots.",
      );
    }
  }
  return (
    <section className="land-planner">
      <div className="paper founding-intro">
        <span className="eyebrow">COMBINE ADJOINING PLOTS / PREVIEW</span>
        <h2>Make room for something bigger.</h2>
        <p>
          Select neighboring home plots on one side of the road, then combine
          them. You can select an existing combined group and its neighbors to
          expand it.
        </p>
        <p>
          Bane’s courthouse already reserves W05–W08. Civic land is unavailable
          for home parcels. This planner is a temporary preview; it does not
          purchase, assign or change land in the live world.
        </p>
        <div className="land-actions">
          <button disabled={selected.length < 2} onClick={combine}>
            Combine selected plots
            {selected.length ? ` (${selected.length})` : ""}
          </button>
          <button
            disabled={!selected.length}
            onClick={() => {
              setSelected([]);
              setMessage("");
            }}
          >
            Clear selection
          </button>
          <button
            disabled={!parcels.length}
            onClick={() => {
              setParcels([]);
              setSelected([]);
              setMessage("Parcel preview reset.");
            }}
          >
            Reset plan
          </button>
        </div>
        <p role="status" aria-live="polite">
          {message || "Choose at least two adjoining home plots below."}
        </p>
      </div>
      {parcels.length ? (
        <div className="parcel-previews">
          {parcels.map((parcel) => (
            <article className="paper plot-card" key={parcel.ids.join("-")}>
              <span className="eyebrow">COMBINED PARCEL PREVIEW</span>
              <h3>{parcel.ids.join(" + ")}</h3>
              <p>
                {parcel.area} m² of plot land · {parcel.ids.length} plots
              </p>
              <p>
                Envelope: {parcel.width} × {parcel.depth} m. Includes{" "}
                {parcel.gapArea} m² of intervening strips that require separate
                approval to incorporate.
              </p>
              <span className="plot-status">
                Not owned · awaiting Bane’s approval
              </span>
              <button
                onClick={() => {
                  setParcels((current) => current.filter((p) => p !== parcel));
                  setSelected((current) =>
                    current.filter((id) => !parcel.ids.includes(id)),
                  );
                  setMessage("Combined preview split into its original plots.");
                }}
              >
                Split preview
              </button>
            </article>
          ))}
        </div>
      ) : null}
      {(["West", "East"] as const).map((side) => (
        <section key={side} className="land-side">
          <h2>{side} side</h2>
          <div className="land-grid">
            {ROAD_PLOTS.filter((p) => p.side === side).map((plot) => {
              const group = parcels.find((p) => p.ids.includes(plot.id));
              return (
                <article
                  className={`paper plot-card ${selected.includes(plot.id) ? "plot-selected" : ""}`}
                  key={plot.id}
                >
                  <span className="eyebrow">
                    {plot.status === "civic"
                      ? "COURTHOUSE RESERVE"
                      : group
                        ? "COMBINED IN PREVIEW"
                        : "PROPOSED PLOT"}
                  </span>
                  <h3>{plot.id}</h3>
                  <p>
                    {plot.width} × {plot.depth} m · {plot.area} m²
                  </p>
                  {group ? <p>Group: {group.ids.join(" + ")}</p> : null}
                  <span className="plot-status">
                    {plot.status === "civic"
                      ? "Bane’s courthouse · not for sale"
                      : "Sale not open"}
                  </span>
                  {plot.status === "planned" ? (
                    <label className="plot-choice">
                      <input
                        type="checkbox"
                        checked={selected.includes(plot.id)}
                        onChange={() => toggle(plot.id)}
                      />
                      Select {group ? "combined group" : plot.id}
                    </label>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
