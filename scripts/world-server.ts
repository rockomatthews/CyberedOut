import { createServer } from "node:http";
import {
  createHash,
  randomUUID,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { parseDesign, defaultDesign } from "../src/lib/game/world";
import { type RoadPeer, ROAD_LIMIT } from "../src/lib/game/road";
import { validateGlb } from "../src/lib/game/avatar";
import { authRoute, loadIdentities, takeTicket } from "./world-auth";
await loadIdentities();
const port = Number(process.env.WORLD_PORT || 3020);
const allowed = new Set(
  (
    process.env.WORLD_ALLOWED_ORIGINS ||
    "http://localhost:3018,http://127.0.0.1:3018,http://localhost:3000"
  )
    .split(",")
    .map((s) => s.trim()),
);
type Player = {
  peer: RoadPeer;
  socket: WebSocket;
  uploadToken: string;
  direction: number;
  restUntil: number;
  lastMessage: number;
  alive: boolean;
};
const players = new Map<string, Player>();
const assets = new Map<string, { data: Buffer; owner: string }>();
let assetBytes = 0;
function cors(origin: string | undefined) {
  return origin && allowed.has(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : {};
}
const server = createServer(async (req, res) => {
  if (await authRoute(req, res)) return;
  const origin = req.headers.origin;
  const headers = cors(origin);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...headers,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
    });
    res.end();
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        players: players.size,
        world: "CyberedOut / Road 001",
      }),
    );
    return;
  }
  const match = req.url?.match(/^\/assets\/([a-f0-9]{64})\.glb$/);
  if (req.method === "GET" && match) {
    const viewerToken = req.headers.authorization?.replace(/^Bearer /, "");
    if (
      !viewerToken ||
      ![...players.values()].some((p) => p.uploadToken === viewerToken)
    ) {
      res.writeHead(401, headers);
      res.end();
      return;
    }
    const asset = assets.get(match[1]);
    if (!asset) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      ...headers,
      "Content-Type": "model/gltf-binary",
      "Content-Length": asset.data.length,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    });
    res.end(asset.data);
    return;
  }
  if (req.method === "POST" && req.url === "/avatars") {
    if (!origin || !allowed.has(origin)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const player = [...players.values()].find(
      (p) =>
        token &&
        token.length === p.uploadToken.length &&
        timingSafeEqual(Buffer.from(token), Buffer.from(p.uploadToken)),
    );
    if (!player) {
      res.writeHead(401, headers);
      res.end();
      return;
    }
    if (Number(req.headers["content-length"]) > 20 * 1024 * 1024) {
      res.writeHead(413, headers);
      res.end();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > 20 * 1024 * 1024) throw new Error("Model exceeds 20 MB.");
        chunks.push(Buffer.from(part));
      }
      const bytes = Buffer.concat(chunks);
      validateGlb(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
      );
      const id = createHash("sha256").update(bytes).digest("hex");
      if (!assets.has(id)) {
        const previous = [...assets.entries()].filter(
          ([, a]) => a.owner === player.peer.id,
        );
        for (const [key, a] of previous) {
          assets.delete(key);
          assetBytes -= a.data.length;
        }
        if (assetBytes + bytes.length > 128 * 1024 * 1024)
          throw new Error("Prototype asset memory is full.");
        assets.set(id, { data: bytes, owner: player.peer.id });
        assetBytes += bytes.length;
      }
      player.peer.modelId = id;
      res.writeHead(200, { ...headers, "Content-Type": "application/json" });
      res.end(JSON.stringify({ model_id: id }));
    } catch (e) {
      res.writeHead(400, { ...headers, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: e instanceof Error ? e.message : "Invalid model",
        }),
      );
    }
    return;
  }
  res.writeHead(404);
  res.end();
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
server.on("upgrade", (req, socket, head) => {
  if (
    req.url !== "/world" ||
    !req.headers.origin ||
    !allowed.has(req.headers.origin) ||
    wss.clients.size >= 64
  ) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws));
});
wss.on("connection", (socket) => {
  const timeout = setTimeout(
    () => socket.close(4001, "Connect your Dot first"),
    5000,
  );
  socket.once("message", (bytes) => {
    let dot;
    try {
      const message = JSON.parse(bytes.toString());
      if (message.type !== "join" || typeof message.ticket !== "string")
        throw new Error();
      dot = takeTicket(message.ticket);
    } catch {}
    if (!dot) {
      socket.close(4001, "Invalid world ticket");
      return;
    }
    if (players.has(dot.id)) {
      socket.close(4009, "This Dot is already on the road");
      return;
    }
    clearTimeout(timeout);
    const id = dot.id;
    const index = players.size;
    const direction = index % 2 ? 1 : -1;
    const player: Player = {
      peer: {
        id,
        design: { ...defaultDesign, name: dot.name },
        x: direction > 0 ? -1.3 : 1.3,
        z: (index % 8) * 2 - 7,
        yaw: direction > 0 ? 0 : Math.PI,
        walking: true,
        automatic: true,
      },
      socket,
      uploadToken: randomBytes(32).toString("base64url"),
      direction,
      restUntil: 0,
      lastMessage: 0,
      alive: true,
    };
    players.set(id, player);
    socket.send(
      JSON.stringify({ type: "welcome", id, upload_token: player.uploadToken }),
    );
    socket.on("pong", () => {
      player.alive = true;
    });
    socket.on("message", (bytes) => {
      const now = Date.now();
      if (now - player.lastMessage < 80) return;
      player.lastMessage = now;
      try {
        const message = JSON.parse(bytes.toString());
        if (message.type === "design") {
          const design = parseDesign(message.design);
          player.peer.design = { ...design, brief: "" };
        }
        if (message.type === "automatic") {
          player.peer.automatic = message.enabled === true;
        }
        if (message.type === "starter") {
          delete player.peer.modelId;
        }
      } catch {
        socket.close(1008, "Invalid message");
      }
    });
    socket.on("close", () => {
      players.delete(id);
      for (const [key, asset] of assets)
        if (asset.owner === id) {
          assets.delete(key);
          assetBytes -= asset.data.length;
        }
    });
    socket.on("error", () => {});
  });
  socket.on("close", () => clearTimeout(timeout));
  socket.on("error", () => {});
});
let last = Date.now();
const tick = setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.2);
  last = now;
  for (const p of players.values()) {
    const walking = p.peer.automatic && now >= p.restUntil;
    p.peer.walking = walking;
    if (walking) {
      p.peer.z += p.direction * 1.65 * dt;
      if (Math.abs(p.peer.z) >= ROAD_LIMIT) {
        p.peer.z = Math.sign(p.peer.z) * ROAD_LIMIT;
        p.direction *= -1;
        p.peer.yaw = p.direction > 0 ? 0 : Math.PI;
        p.restUntil = now + 2500;
      }
    }
  }
  const message = JSON.stringify({
    type: "snapshot",
    at: now,
    players: [...players.values()].map((p) => p.peer),
  });
  for (const p of players.values())
    if (p.socket.readyState === WebSocket.OPEN) p.socket.send(message);
}, 100);
const heartbeat = setInterval(() => {
  for (const p of players.values()) {
    if (!p.alive) {
      p.socket.terminate();
      continue;
    }
    p.alive = false;
    p.socket.ping();
  }
}, 15000);
server.listen(port, "0.0.0.0", () =>
  console.log(`CyberedOut Road 001 multiplayer listening on port ${port}`),
);
function stop() {
  clearInterval(tick);
  clearInterval(heartbeat);
  for (const p of players.values()) p.socket.close();
  wss.close();
  server.close();
}
process.on("SIGTERM", stop);
process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
