import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
let status = 503;
const backend = createServer((req, res) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify(
      status === 200
        ? { dot: { id: "session-ui-test", name: "Session UI QA" } }
        : { error: "Temporary verification failure" },
    ),
  );
});
backend.listen(0, "127.0.0.1");
await once(backend, "listening");
const web = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3035"],
  {
    env: {
      ...process.env,
      WORLD_SERVER_URL: `http://127.0.0.1:${backend.address().port}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Web startup timeout")),
      15000,
    );
    web.stdout.on("data", (b) => {
      if (b.toString().includes("Ready")) {
        clearTimeout(timer);
        resolve();
      }
    });
    web.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Web startup failed"));
    });
  });
  for (status of [429, 503])
    for (const path of ["/", "/town", "/characters"]) {
      const r = await fetch("http://127.0.0.1:3035" + path, {
        headers: { Cookie: "cyberedout_world_session=isolated-test-cookie" },
        redirect: "manual",
      });
      assert.equal(r.status, 200, `${path} must not redirect on ${status}`);
      const body = await r.text();
      assert.ok(body.includes("Retry connection"));
      assert.ok(!body.includes("Got your AI"));
    }
  console.log(
    "PASS temporary 429/503 session failures preserve remembered-browser UI and never show the code form",
  );
  status = 401;
  const invalid = await fetch("http://127.0.0.1:3035/town", {
    headers: { Cookie: "cyberedout_world_session=isolated-test-cookie" },
    redirect: "manual",
  });
  assert.equal(invalid.status, 307);
  status = 200;
  const restored = await fetch("http://127.0.0.1:3035/world", {
    headers: { Cookie: "cyberedout_world_session=isolated-test-cookie" },
  });
  assert.ok((await restored.text()).includes("session-ui-test"));
  console.log(
    "PASS genuinely invalid sessions remain protected and recovered service restores the same AI",
  );
} finally {
  const done = once(web, "exit");
  web.kill("SIGTERM");
  await done;
  await new Promise((resolve) => backend.close(resolve));
}
