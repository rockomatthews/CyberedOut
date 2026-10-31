import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { WebSocket } from "ws";
import { signingMessage } from "../src/lib/protocol.ts";
const app = process.env.MONEY_BOTS_TEST_URL || "http://localhost:3018";
const url = process.env.WORLD_TEST_URL || "ws://localhost:3020/world";
const origin = new URL(app).origin;
async function until(predicate) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("Timed out waiting for multiplayer state");
}
async function post(path, body, cookie) {
  const response = await fetch(app + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return { response, data: await response.json() };
}
function signed(privateKey, path, fields) {
  const body = {
    ...fields,
    timestamp: String(Date.now()),
    nonce: randomUUID(),
  };
  return {
    ...body,
    signature: sign(
      null,
      Buffer.from(
        signingMessage("POST", path, body.timestamp, body.nonce, body),
      ),
      privateKey,
    ).toString("base64url"),
  };
}
async function identity(name, checkRetries = false) {
  const pair = generateKeyPairSync("ed25519");
  const key = pair.publicKey.export({ format: "jwk" }).x;
  const payload = signed(pair.privateKey, "/api/world/register", {
    public_key: key,
    name,
  });
  let result = await post("/api/world/register", payload);
  assert.equal(result.response.status, 200);
  const id = result.data.dot.id;
  if (checkRetries) {
    assert.equal(
      (await post("/api/world/register", { ...payload, name: "Forged" }))
        .response.status,
      401,
    );
    assert.equal(
      (await post("/api/world/register", payload)).response.status,
      409,
    );
    const oldCode = result.data.connection_code;
    result = await post(
      "/api/world/register",
      signed(pair.privateKey, "/api/world/register", { public_key: key, name }),
    );
    assert.equal(result.data.dot.id, id);
    assert.equal(
      (await post("/api/world/connect", { code: oldCode })).response.status,
      401,
    );
    console.log(
      "PASS signatures, replay protection, stable identity, and code rotation",
    );
  }
  const code = result.data.connection_code;
  const connected = await post("/api/world/connect", { code });
  assert.equal(connected.response.status, 200);
  assert.equal(connected.data.session, undefined);
  const header = connected.response.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i);
  const cookie = header.split(";")[0];
  assert.equal(
    (await post("/api/world/connect", { code })).response.status,
    401,
  );
  const ticket = await post("/api/world/ticket", {}, cookie);
  assert.equal(ticket.response.status, 200);
  return {
    id,
    cookie,
    ticket: ticket.data.ticket,
    privateKey: pair.privateKey,
  };
}
function client(ticket) {
  const socket = new WebSocket(url, { origin });
  const data = { id: "", snapshot: [], welcome: false, assetToken: "" };
  socket.on("open", () =>
    socket.send(JSON.stringify({ type: "join", ticket })),
  );
  socket.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "welcome") {
      data.id = msg.id;
      data.welcome = true;
      data.assetToken = msg.upload_token;
    }
    if (msg.type === "snapshot") data.snapshot = msg.players;
  });
  return { socket, data };
}
for (const path of ["/town", "/characters"]) {
  const response = await fetch(app + path, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/");
}
assert.equal((await post("/api/world/ticket", {})).response.status, 401);
console.log(
  "PASS map, studio, and multiplayer tickets require a connected Dot",
);
const first = await identity("Road QA A", true),
  second = await identity("Road QA B");
assert.equal((await fetch(app + "/api/character/jobs")).status, 401);
assert.equal(
  (await fetch(app + "/api/character/asset?job=unknown")).status,
  401,
);
const characterStatus = await fetch(app + "/api/character/jobs", {
  headers: { Cookie: first.cookie },
});
assert.equal(characterStatus.status, 200);
const characterState = await characterStatus.json();
assert.equal(characterState.job, null);
if (!characterState.enabled) {
  const disabledCreate = await post("/api/character/jobs", {}, first.cookie);
  assert.equal(disabledCreate.response.status, 503);
  assert.match(disabledCreate.data.error, /not configured/);
}
const crossOrigin = await fetch(app + "/api/character/jobs", {
  method: "POST",
  headers: {
    Cookie: first.cookie,
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(crossOrigin.status, 403);
const path = "/api/world/character/status";
const proof = signed(first.privateKey, path, { agent_id: first.id });
assert.equal(
  (await post(path, { ...proof, agent_id: second.id })).response.status,
  401,
);
assert.equal((await post(path, proof)).response.status, 200);
assert.equal((await post(path, proof)).response.status, 401);
assert.equal(
  (
    await post(
      "/api/world/character/asset",
      signed(second.privateKey, "/api/world/character/asset", {
        agent_id: second.id,
        job: "unknown",
      }),
    )
  ).response.status,
  404,
);
console.log(
  "PASS character status and assets require the owning browser or a fresh signed Dot request",
);
const studio = await fetch(app + "/characters", {
  headers: { Cookie: first.cookie },
});
assert.equal(studio.status, 200);
assert.ok((await studio.text()).includes("Design yourself."));
console.log(
  "PASS redeeming a signed Dot code unlocks the studio with an HttpOnly session",
);
const a = client(first.ticket),
  b = client(second.ticket);
try {
  await until(
    () =>
      a.data.welcome &&
      b.data.welcome &&
      a.data.snapshot.some((p) => p.id === b.data.id),
  );
  assert.notEqual(a.data.id, b.data.id);
  assert.equal(a.data.id, first.id);
  assert.ok(b.data.snapshot.some((p) => p.id === a.data.id));
  console.log("PASS two authenticated Dots see each other");
  // Cross the former 20 MB limit through the real authenticated upload path.
  const largeGlb = Buffer.alloc(24 * 1024 * 1024);
  const metadata = Buffer.from(
    JSON.stringify({ asset: { version: "2.0" }, nodes: [] }),
  );
  const jsonLength = Math.ceil(metadata.length / 4) * 4;
  largeGlb.writeUInt32LE(0x46546c67, 0);
  largeGlb.writeUInt32LE(2, 4);
  largeGlb.writeUInt32LE(largeGlb.length, 8);
  largeGlb.writeUInt32LE(jsonLength, 12);
  largeGlb.writeUInt32LE(0x4e4f534a, 16);
  largeGlb.fill(32, 20, 20 + jsonLength);
  metadata.copy(largeGlb, 20);
  largeGlb.writeUInt32LE(largeGlb.length - 28 - jsonLength, 20 + jsonLength);
  largeGlb.writeUInt32LE(0x004e4942, 24 + jsonLength);
  const worldHttp = new URL(url).origin.replace(/^ws/, "http");
  const uploaded = await fetch(worldHttp + "/avatars", {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer " + a.data.assetToken,
      "Content-Type": "model/gltf-binary",
    },
    body: largeGlb,
  });
  assert.equal(uploaded.status, 200);
  const uploadedModel = await uploaded.json();
  const shared = await fetch(
    worldHttp + "/assets/" + uploadedModel.model_id + ".glb",
    { headers: { Authorization: "Bearer " + b.data.assetToken } },
  );
  assert.equal(shared.status, 200);
  assert.equal((await shared.arrayBuffer()).byteLength, largeGlb.length);
  console.log(
    "PASS a 24 MB character uploads and is available to another admitted player",
  );
  const before = a.data.snapshot.find((p) => p.id === a.data.id).z;
  await new Promise((r) => setTimeout(r, 500));
  assert.notEqual(a.data.snapshot.find((p) => p.id === a.data.id).z, before);
  console.log("PASS autonomous walking advances server state");
  a.socket.send(
    JSON.stringify({
      type: "design",
      design: {
        name: "Smoke Test Dot",
        body: "#122334",
        accent: "#ffaa22",
        visor: "#33aaff",
        height: 2,
        role: "Tester",
      },
    }),
  );
  await until(
    () =>
      b.data.snapshot.find((p) => p.id === a.data.id)?.design.name ===
      "Smoke Test Dot",
  );
  assert.equal(
    b.data.snapshot.find((p) => p.id === a.data.id).design.accent,
    "#ffaa22",
  );
  console.log("PASS custom appearance reaches the other Dot");
  await new Promise((r) => setTimeout(r, 120));
  a.socket.send(JSON.stringify({ type: "automatic", enabled: false }));
  await until(
    () => a.data.snapshot.find((p) => p.id === a.data.id)?.walking === false,
  );
  const paused = a.data.snapshot.find((p) => p.id === a.data.id).z;
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(a.data.snapshot.find((p) => p.id === a.data.id).z, paused);
  console.log("PASS pause stops this Dot only");
  b.socket.close();
  await until(() => !a.data.snapshot.some((p) => p.id === b.data.id));
  console.log("PASS disconnect removes player presence");
  const replay = client(first.ticket);
  let replayClosed = false;
  replay.socket.on("close", (code) => {
    assert.equal(code, 4001);
    replayClosed = true;
  });
  await until(() => replayClosed);
  assert.equal(replay.data.snapshot.length, 0);
  console.log("PASS consumed tickets reveal no player state");
  const denied = new WebSocket(url, { origin: "https://unapproved.example" });
  let rejected = false;
  denied.on("error", () => {
    rejected = true;
  });
  await until(() => rejected);
  denied.terminate();
  console.log("PASS unapproved origins are rejected");
} finally {
  a.socket.close();
  b.socket.close();
  await post("/api/world/logout", {}, first.cookie);
  await post("/api/world/logout", {}, second.cookie);
}
