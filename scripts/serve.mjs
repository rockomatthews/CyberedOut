import { spawn } from "node:child_process";
import nextEnv from "@next/env";

// Keep local signup and the website in the same process lifecycle. Hosted web
// instances use WORLD_SERVER_URL and run their persistent world separately.
const mode = process.argv[2];
if (!["dev", "start"].includes(mode)) throw new Error("Expected dev or start");
nextEnv.loadEnvConfig(process.cwd(), mode === "dev");
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
function launch(args) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
  children.add(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => {
    children.delete(child);
    if (!stopping) stop(code || 1);
  });
  return child;
}
try {
  if (!process.env.WORLD_SERVER_URL && !process.env.VERCEL) {
    const port = Number(process.env.WORLD_PORT || 3020);
    process.env.WORLD_SERVER_URL = `http://127.0.0.1:${port}`;
    launch(["--import", "tsx", "scripts/world-server.ts"]);
    const deadline = Date.now() + 15000;
    let ready = false;
    while (!stopping && Date.now() < deadline) {
      try {
        const response = await fetch(`${process.env.WORLD_SERVER_URL}/health`, {
          signal: AbortSignal.timeout(1000),
        });
        const health = await response.json();
        if (response.ok && health.ok && health.world === "CyberedOut / Road 001") {
          ready = true;
          break;
        }
      } catch { /* The child is still starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready || stopping) throw new Error("CyberedOut world service failed to start.");
  }
  if (!stopping) launch([
    "node_modules/next/dist/bin/next", mode,
    ...(mode === "dev" ? ["--hostname", "0.0.0.0"] : []),
    ...process.argv.slice(3),
  ]);
} catch (error) {
  console.error(error.message);
  stop(1);
}
