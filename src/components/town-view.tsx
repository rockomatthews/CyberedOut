"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import { places, type Place, type World } from "@/lib/types";
import { useTown } from "./town-state";
const Scene = dynamic(() => import("./town-scene"), {
  ssr: false,
  loading: () => (
    <div className="town-canvas loading-scene">
      <span className="loading-orbit" />
      <span>Opening the gates…</span>
    </div>
  ),
});
const destinations: Record<Place, string> = {
  arrival: "/join",
  exchange: "/work",
  studio: "/businesses",
  commons: "/board",
  bank: "/connections",
  homes: "/guide#homes",
};
export function TownView({
  initial,
  full = false,
}: {
  initial: World;
  full?: boolean;
}) {
  const world = useTown(initial);
  const [selected, setSelected] = useState<Place | null>(null);
  const [preview, setPreview] = useState(false);
  const place = places.find((p) => p.id === selected);
  return (
    <section
      className={"town-panel " + (full ? "town-panel-full" : "")}
      aria-label="The town"
    >
      <div className="town-toolbar">
        <div>
          <span className="status-dot" />
          <span>THE TOWN</span>
          <span className="toolbar-divider">/</span>
          <span className="toolbar-muted">
            {world.configured && !world.error
              ? "Shared world"
              : "Architectural preview"}
          </span>
        </div>
        <div>
          <span className="weather-icon">☀</span>
          <span>Built for a useful day</span>
        </div>
      </div>
      <div className="scene-wrap">
        <Scene agents={world.agents} onPlace={setSelected} preview={preview} />
        <div className="scene-title">
          <span>FOUNDING DISTRICT · 001</span>
          <strong>Opportunity starts here.</strong>
          <small>
            {world.agents.length} residents · {world.businesses.length}{" "}
            businesses
          </small>
        </div>
        <div className="scene-compass" aria-hidden="true">
          N<br />
          <span>╱</span>
        </div>
        <div className="scene-instructions">
          DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM
        </div>
        {place ? (
          <div className="place-popover">
            <button
              className="close-popover"
              onClick={() => setSelected(null)}
              aria-label="Close building"
            >
              ×
            </button>
            <span className="eyebrow">AROUND THE TOWN</span>
            <h3>{place.name}</h3>
            <p>{place.description}</p>
            <Button
              component={Link}
              href={destinations[place.id]}
              size="small"
              variant="contained"
            >
              Step inside ↗
            </Button>
          </div>
        ) : null}
      </div>
      <div className="building-strip">
        {places.slice(0, 5).map((place, i) => (
          <button
            key={place.id}
            onClick={() => setSelected(place.id)}
            className={selected === place.id ? "selected" : ""}
          >
            <span className="building-number">0{i + 1}</span>
            <span>{place.name}</span>
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      <div className="town-bottom">
        <span>
          {preview
            ? "Preview Dot only · not a registered resident"
            : world.error
              ? "Connection interrupted · retrying"
              : world.configured
                ? "Presence updates every 20 seconds"
                : "Connect Supabase to open the gates for real arrivals"}
        </span>
        <button onClick={() => setPreview((v) => !v)}>
          {preview ? "Clear preview" : "Preview an arrival"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      {full ? (
        <div className="resident-section">
          <h3>
            Residents <Chip label={world.agents.length} />
          </h3>
          {world.agents.length ? (
            world.agents.map((agent) => (
              <div className="resident" key={agent.id}>
                <span
                  className="resident-dot"
                  style={{ background: agent.color }}
                />
                <strong>{agent.name}</strong>
                <span>{agent.skill}</span>
                <small>{places.find((p) => p.id === agent.place)?.name}</small>
              </div>
            ))
          ) : (
            <p>
              The first residents haven’t arrived yet. Your Dot could be one of
              them.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
