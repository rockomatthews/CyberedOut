"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { watchRoad } from "@/lib/game/spectator";
import { defaultDesign } from "@/lib/game/world";
import type { RoadPeer } from "@/lib/game/road";
const Scene = dynamic(() => import("./town-scene"), {
  ssr: false,
  loading: () => (
    <div className="town-canvas loading-scene">Opening Road 001…</div>
  ),
});
export function WorldView() {
  const [peers, setPeers] = useState<RoadPeer[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("Opening the live world…");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [reset, setReset] = useState(0);
  useEffect(
    () =>
      watchRoad({
        onPeers: setPeers,
        onToken: setToken,
        onState: (text, ok) => {
          setMessage(text);
          setConnected(ok);
        },
      }),
    [],
  );
  return (
    <section
      className="town-panel road-panel"
      aria-label="Public world spectator view"
    >
      <div className="town-toolbar">
        <div>
          <span className={connected ? "status-dot" : "offline-dot"} />
          <span>ROAD 001</span>
          <span className="toolbar-divider">/</span>
          <span>
            {connected
              ? `${peers.length} ${peers.length === 1 ? "Dot" : "Dots"} on the road`
              : "Connecting"}
          </span>
        </div>
        <div>SPECTATOR</div>
      </div>
      <div className="scene-wrap">
        {connected ? (
          <Scene
            peers={peers}
            myId=""
            assetToken={token}
            design={defaultDesign}
            spectator
            follow={false}
            resetCamera={reset}
            onStatus={setStatus}
          />
        ) : (
          <div className="scene-fallback">
            <strong>Opening the world.</strong>
            <p>{message}</p>
          </div>
        )}
        <div className="scene-title">
          <span>THE WHOLE WORLD, FOR NOW</span>
          <strong>One road. Room to grow.</strong>
          <small>
            {connected && peers.length === 0
              ? "The road is quiet. No Dots are connected right now."
              : "Live Dots. You’re here to watch."}
          </small>
        </div>
        <div className="world-tools">
          <button onClick={() => setReset((v) => v + 1)}>Reset view</button>
        </div>
        <div className="scene-instructions">
          SPECTATOR VIEW · DRAG TO ORBIT · SCROLL TO ZOOM
        </div>
      </div>
      <div className="road-presence">
        <span className="eyebrow">ON THE ROAD</span>
        {peers.length ? (
          peers.map((peer) => (
            <span className="peer-pill" key={peer.id}>
              <i style={{ background: peer.design.accent }} />
              {peer.design.name}
            </span>
          ))
        ) : (
          <span className="muted">
            {connected ? "No Dots connected." : "Waiting for the world."}
          </span>
        )}
      </div>
      <div className="town-bottom" role="status">
        <span>{status || message} Watching does not create a Dot.</span>
        <Link href="/">Connect your Dot to join</Link>
      </div>
    </section>
  );
}
