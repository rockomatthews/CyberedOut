"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  defaultDesign,
  parseDesign,
  CHARACTER_KEY,
  ADMISSION_KEY,
  type CharacterDesign,
} from "@/lib/game/world";
import { type RoadPeer } from "@/lib/game/road";
import { connectRoad } from "@/lib/game/multiplayer";
import { avatarFile } from "@/lib/game/storage";
const Scene = dynamic(() => import("./town-scene"), {
  ssr: false,
  loading: () => (
    <div className="town-canvas loading-scene">Opening Road 001…</div>
  ),
});
export function TownView() {
  const [peers, setPeers] = useState<RoadPeer[]>([]);
  const [myId, setMyId] = useState("");
  const [assetToken, setAssetToken] = useState("");
  const [design, setDesign] = useState<CharacterDesign>(defaultDesign);
  const [file, setFile] = useState<File | null>(null);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState(
    "Connecting to the multiplayer road…",
  );
  const [status, setStatus] = useState("");
  const [automatic, setAutomatic] = useState(true);
  const [follow, setFollow] = useState(true);
  const [reset, setReset] = useState(0);
  const transport = useRef<ReturnType<typeof connectRoad> | null>(null);
  useEffect(() => {
    let design = defaultDesign;
    try {
      design = parseDesign(
        JSON.parse(localStorage.getItem(CHARACTER_KEY) || "null"),
      );
    } catch {}
    setDesign(design);
    void avatarFile()
      .then(setFile)
      .catch(() => {});
    if (
      localStorage.getItem(ADMISSION_KEY) !== "1" ||
      design.name.trim() === defaultDesign.name ||
      design.name.trim().length < 2
    ) {
      setConnection(
        "Customize and name your character before joining the road.",
      );
      return;
    }
    const client = connectRoad({
      onPeers: setPeers,
      onIdentity: (id, token) => {
        setMyId(id);
        setAssetToken(token || "");
      },
      onState: (text, ok) => {
        setConnection(text);
        setConnected(ok);
      },
    });
    transport.current = client;
    client.design(design);
    return () => {
      client.close();
      transport.current = null;
    };
  }, []);
  async function share() {
    if (!file) return;
    try {
      await transport.current?.upload(file);
      setStatus(
        "Your model is shared with players connected to this road server. It lasts until you disconnect or the server restarts.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Model could not be shared.");
    }
  }
  return (
    <section className="town-panel road-panel" aria-label="Multiplayer road">
      <div className="town-toolbar">
        <div>
          <span className={connected ? "status-dot" : "offline-dot"} />
          <span>ROAD 001</span>
          <span className="toolbar-divider">/</span>
          <span>
            {connected
              ? `${peers.length} ${peers.length === 1 ? "player" : "players"} connected`
              : "Awaiting connection"}
          </span>
        </div>
        <div>120 METERS / DAY ONE</div>
      </div>
      <div className="scene-wrap">
        {connected ? (
          <Scene
            peers={peers}
            myId={myId}
            assetToken={assetToken}
            design={design}
            modelFile={file}
            onStatus={setStatus}
            follow={follow}
            resetCamera={reset}
          />
        ) : (
          <div className="scene-fallback">
            <strong>Waiting for your Dot.</strong>
            <p>{connection}</p>
          </div>
        )}
        <div className="scene-title">
          <span>THE WHOLE WORLD, FOR NOW</span>
          <strong>One road. Room to grow.</strong>
          <small>
            {connected
              ? "Real players. Automatic walking."
              : "The world stays hidden until your Dot is connected."}
          </small>
        </div>
        <div className="world-tools">
          <button
            disabled={!connected}
            onClick={() => {
              setAutomatic((v) => !v);
              transport.current?.automatic(!automatic);
            }}
          >
            {automatic ? "Pause my Dot" : "Resume my Dot"}
          </button>
          <button onClick={() => setFollow((v) => !v)}>
            {follow ? "Free camera" : "Follow my Dot"}
          </button>
          <button onClick={() => setReset((v) => v + 1)}>Reset view</button>
        </div>
        <div className="scene-instructions">
          CHARACTERS WALK ON THEIR OWN · DRAG TO ORBIT · SCROLL TO ZOOM
        </div>
      </div>
      <div className="road-bottom">
        <div>
          <span className="eyebrow">YOUR CHARACTER</span>
          <strong>{design.name}</strong>
          <span>
            {design.role} · {file ? "custom GLB" : "customizable starter"}
          </span>
        </div>
        <Link href="/characters">Customize your character</Link>
        {file ? (
          <button disabled={!connected} onClick={() => void share()}>
            Share this model with the road
          </button>
        ) : null}
      </div>
      <div className="road-presence">
        <span className="eyebrow">ON THE ROAD</span>
        {connected ? (
          peers.map((peer) => (
            <span className="peer-pill" key={peer.id}>
              <i style={{ background: peer.design.accent }} />
              {peer.design.name}
              {peer.id === myId ? " · you" : ""}
            </span>
          ))
        ) : (
          <span className="muted">No multiplayer session established.</span>
        )}
      </div>
      <div className="town-bottom" role="status">
        <span>{status || connection}</span>
        <a
          href="https://github.com/rockomatthews/CyberedOut"
          target="_blank"
          rel="noreferrer"
        >
          Open-source world
        </a>
      </div>
    </section>
  );
}
