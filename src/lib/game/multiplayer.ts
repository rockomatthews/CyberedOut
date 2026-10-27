"use client";
import { safePeer, worldServerUrl, type RoadPeer } from "./road";
import { type CharacterDesign } from "./world";
export function connectRoad({
  onPeers,
  onState,
  onIdentity,
}: {
  onPeers: (peers: RoadPeer[]) => void;
  onState: (state: string, connected: boolean) => void;
  onIdentity: (id: string, assetToken?: string) => void;
}) {
  const base = worldServerUrl();
  let socket: WebSocket | null = null;
  let token = "";
  let stopped = false;
  let reconnect: ReturnType<typeof setTimeout> | null = null;
  let latest: CharacterDesign | null = null;
  function send(message: unknown) {
    if (socket?.readyState === WebSocket.OPEN)
      socket.send(JSON.stringify(message));
  }
  async function connect() {
    if (!base) {
      onState("The multiplayer host is not configured.", false);
      return;
    }
    onState("Verifying your Dot connection…", false);
    let ticket: string;
    try {
      const response = await fetch("/api/world/ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) {
        onState(data.error || "Connect your Dot first.", false);
        return;
      }
      ticket = data.ticket;
    } catch {
      onState("The multiplayer service is unavailable.", false);
      if (!stopped) reconnect = setTimeout(() => void connect(), 2500);
      return;
    }
    if (stopped) return;
    socket = new WebSocket(base + "/world");
    socket.onopen = () => send({ type: "join", ticket });
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "welcome") {
          token = message.upload_token;
          onIdentity(message.id, token);
          onState("Your Dot is connected to Road 001", true);
          if (latest) send({ type: "design", design: latest });
        }
        if (message.type === "snapshot" && Array.isArray(message.players))
          onPeers(
            message.players
              .map(safePeer)
              .filter((v: RoadPeer | null): v is RoadPeer => Boolean(v)),
          );
      } catch {}
    };
    socket.onerror = () => {};
    socket.onclose = (event) => {
      token = "";
      onPeers([]);
      onIdentity("");
      onState(
        event.code === 4009
          ? "This Dot is already on the road in another window."
          : "Road connection closed.",
        false,
      );
      if (!stopped && event.code !== 4009 && event.code !== 4001)
        reconnect = setTimeout(() => void connect(), 2500);
    };
  }
  connect();
  return {
    design: (value: CharacterDesign) => {
      latest = { ...value, brief: "" };
      send({ type: "design", design: latest });
    },
    automatic: (enabled: boolean) => send({ type: "automatic", enabled }),
    starter: () => send({ type: "starter" }),
    upload: async (file: File) => {
      if (!token || socket?.readyState !== WebSocket.OPEN)
        throw new Error("Connect to the road before sharing a model.");
      const response = await fetch(base.replace(/^ws/, "http") + "/avatars", {
        method: "POST",
        headers: {
          "Content-Type": "model/gltf-binary",
          Authorization: "Bearer " + token,
        },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Model upload failed.");
      return result.model_id as string;
    },
    close: () => {
      stopped = true;
      if (reconnect) clearTimeout(reconnect);
      socket?.close();
    },
  };
}
