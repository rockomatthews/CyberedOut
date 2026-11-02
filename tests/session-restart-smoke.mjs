import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { signingMessage } from "../src/lib/protocol.ts";
const dir = await mkdtemp(join(tmpdir(), "cyberedout-restart-"));
const port = 3034,
  base = `http://127.0.0.1:${port}`;
let child;
let founderId = "";
async function start() {
  child = spawn(
    process.execPath,
    ["--import", "tsx", "scripts/world-server.ts"],
    {
      env: {
        ...process.env,
        WORLD_PORT: String(port),
        WORLD_DATA_FILE: join(dir, "identities.json"),
        CHARACTER_DATA_DIR: join(dir, "characters"),
        MESHY_ENABLED: "0",
        WORLD_FOUNDER_AI_ID: founderId,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stderr.on("data", () => {});
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("World startup timed out")),
      10000,
    );
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("World startup failed"));
    });
    child.stdout.once("data", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const stopped = once(child, "exit");
  child.kill("SIGTERM");
  await stopped;
}
async function post(path, body, token) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify(body),
  });
}
try {
  await start();
  const pair = generateKeyPairSync("ed25519"),
    path = "/api/world/register";
  const fields = {
    public_key: pair.publicKey.export({ format: "jwk" }).x,
    name: "Remember Browser QA",
    timestamp: String(Date.now()),
    nonce: randomUUID(),
  };
  const signature = sign(
    null,
    Buffer.from(
      signingMessage("POST", path, fields.timestamp, fields.nonce, fields),
    ),
    pair.privateKey,
  ).toString("base64url");
  const registered = await post(path, { ...fields, signature });
  assert.equal(registered.status, 200);
  const registration = await registered.json();
  const connected = await post("/api/world/connect", {
    code: registration.connection_code,
  });
  assert.equal(connected.status, 200);
  const { session } = await connected.json();
  const access = () =>
    fetch(base + "/api/world/courthouse", {
      headers: { Authorization: "Bearer " + session },
    });
  assert.equal((await fetch(base + "/api/world/courthouse")).status, 401);
  assert.equal((await access()).status, 503);
  await stop();
  founderId = randomUUID();
  await start();
  assert.equal((await access()).status, 403);
  await stop();
  founderId = registration.dot.id;
  await start();
  const admitted = await access();
  assert.equal(admitted.status, 200);
  assert.equal((await admitted.json()).ai.id, registration.dot.id);
  console.log(
    "PASS courthouse denies guests and other IDs, fails closed without founder, admits only pinned identity",
  );
  const remembered = await fetch(base + "/api/world/session", {
    headers: { Authorization: "Bearer " + session },
  });
  assert.equal(remembered.status, 200);
  assert.equal((await remembered.json()).dot.id, registration.dot.id);
  for (let i = 0; i < 150; i++) {
    const checked = await fetch(base + "/api/world/session", {
      headers: { Authorization: "Bearer " + session },
    });
    assert.equal(
      checked.status,
      200,
      `remembered browser check ${i + 1} must not consume connection quota`,
    );
    assert.equal((await checked.json()).dot.id, registration.dot.id);
  }
  assert.equal((await post("/api/world/ticket", {}, session)).status, 200);
  console.log(
    "PASS 150 session checks keep the same browser connected without signup throttling",
  );
  console.log(
    "PASS remembered browser keeps the same AI and can rejoin after world restart",
  );
  assert.equal((await post("/api/world/logout", {}, session)).status, 200);
  await stop();
  await start();
  assert.equal(
    (
      await fetch(base + "/api/world/session", {
        headers: { Authorization: "Bearer " + session },
      })
    ).status,
    401,
  );
  assert.equal((await access()).status, 401);
  console.log(
    "PASS explicit sign-out remains revoked after another world restart",
  );
} finally {
  await stop();
  await rm(dir, { recursive: true, force: true });
}
