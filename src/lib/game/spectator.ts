"use client";
import { safePeer, worldServerUrl, type RoadPeer } from "./road";
export function watchRoad({
  onPeers,
  onState,
  onToken,
}: {
  onPeers: (peers: RoadPeer[]) => void;
  onState: (message: string, connected: boolean) => void;
  onToken: (token: string) => void;
}) {
  let socket: WebSocket | null = null;
  let stopped = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const base = worldServerUrl();
  function connect() {
    if (stopped) return;
    if (!base) {
      onState("The world host is not configured yet.", false);
      return;
    }
    onState("Opening the live world…", false);
    socket = new WebSocket(base + "/world");
    socket.onopen = () => socket?.send(JSON.stringify({ type: "watch" }));
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (
          message.type === "watching" &&
          typeof message.viewer_token === "string"
        ) {
          failures = 0;
          onToken(message.viewer_token);
          onState("You’re watching the live road.", true);
        }
        if (message.type === "snapshot" && Array.isArray(message.players))
          onPeers(
            message.players
              .map(safePeer)
              .filter((p: RoadPeer | null): p is RoadPeer => p !== null),
          );
      } catch {
        /* Ignore malformed remote state. */
      }
    };
    socket.onerror = () => {};
    socket.onclose = () => {
      if (stopped) return;
      onPeers([]);
      onToken("");
      onState("The world is reconnecting…", false);
      retry = setTimeout(
        connect,
        Math.min(30000, 1000 * 2 ** Math.min(++failures, 5)),
      );
    };
  }
  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    socket?.close();
  };
}
