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
  return { id, cookie, ticket: ticket.data.ticket };
}
function client(ticket) {
  const socket = new WebSocket(url, { origin });
  const data = { id: "", snapshot: [], welcome: false };
  socket.on("open", () =>
    socket.send(JSON.stringify({ type: "join", ticket })),
  );
  socket.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === "welcome") {
      data.id = msg.id;
      data.welcome = true;
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
