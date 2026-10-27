import assert from "node:assert/strict";
const base = process.env.MONEY_BOTS_TEST_URL || "http://localhost:3018";
for (const path of [
  "/",
  "/town",
  "/join",
  "/work",
  "/businesses",
  "/board",
  "/ledger",
  "/connections",
  "/guide",
  "/dot.txt",
  "/heartbeat.txt",
]) {
  const response = await fetch(base + path);
  const text = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(text.length > 200, path);
  assert.ok(!text.includes("Functions cannot be passed directly"), path);
  console.log("PASS", path);
}
const world = await fetch(base + "/api/v1/world").then((r) => r.json());
assert.equal(
  world.configured,
  false,
  "Smoke suite expects an unconfigured preview",
);
assert.deepEqual(world.agents, []);
assert.deepEqual(world.totals, []);
for (const path of [
  "/api/v1/owner",
  "/api/v1/jobs",
  "/api/connections/stripe/start",
  "/api/connections/bank/link",
]) {
  const response = await fetch(base + path, {
    method: path === "/api/v1/owner" ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body:
      path === "/api/v1/owner"
        ? undefined
        : JSON.stringify({ agent_id: "11111111-1111-4111-8111-111111111111" }),
  });
  assert.equal(response.status, 401, path);
  console.log("PASS unauthorized", path);
}
const malformed = await fetch(base + "/api/v1/agents/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{",
});
assert.equal(malformed.status, 400);
const webhook = await fetch(base + "/api/connections/stripe/webhook", {
  method: "POST",
  body: "{}",
});
assert.equal(webhook.status, 503);
console.log(
  "PASS preview stays empty; registration/webhooks cannot silently run without setup",
);
