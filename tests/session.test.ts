import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionStore } from "../scripts/session-store";
import { ROAD_SESSION_SECONDS } from "../src/lib/game/session";
test("remembered browser survives a restart with only hashed tokens stored", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cyberedout-session-"));
  try {
    const filename = join(dir, "sessions.json"),
      store = new SessionStore(filename);
    await store.load();
    const token = await store.create("bane-dot");
    assert.equal(store.get(token), "bane-dot");
    assert.equal(store.get("forged-token"), null);
    const saved = await readFile(filename, "utf8");
    assert.ok(!saved.includes(token));
    const rows = JSON.parse(saved);
    assert.match(rows[0].hash, /^[a-f0-9]{64}$/);
    assert.ok(
      Math.abs(rows[0].expires - Date.now() - ROAD_SESSION_SECONDS * 1000) <
        2000,
    );
    assert.equal((await stat(filename)).mode & 0o777, 0o600);
    const restarted = new SessionStore(filename);
    await restarted.load();
    assert.equal(restarted.get(token), "bane-dot");
    await restarted.revoke(token);
    const afterLogout = new SessionStore(filename);
    await afterLogout.load();
    assert.equal(afterLogout.get(token), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("expired sessions are refused after restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cyberedout-session-expiry-"));
  try {
    const filename = join(dir, "sessions.json"),
      store = new SessionStore(filename);
    const token = await store.create("expired-dot");
    const rows = JSON.parse(await readFile(filename, "utf8"));
    rows[0].expires = Date.now() - 1;
    await writeFile(filename, JSON.stringify(rows));
    const restarted = new SessionStore(filename);
    await restarted.load();
    assert.equal(restarted.get(token), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
