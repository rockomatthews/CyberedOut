import type { IncomingMessage, ServerResponse } from "node:http";
import { CharacterJobs } from "./character-jobs";
import { characterDot } from "./world-auth";

export function characterRoutes(jobs: CharacterJobs, enabled: boolean) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url?.startsWith("/api/world/character/")) return false;
    const answer = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
      return true;
    };
    if (req.method !== "POST") return answer(405, { error: "POST required." });
    const path = req.url;
    if (
      !["create", "status", "asset"].some(
        (a) => path === "/api/world/character/" + a,
      )
    )
      return answer(404, { error: "Unknown character endpoint." });
    let body: Record<string, unknown>;
    try {
      const parts: Buffer[] = [];
      let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > 2_810_000)
          return answer(413, { error: "Use an image up to 2 MB." });
        parts.push(Buffer.from(part));
      }
      body = JSON.parse(Buffer.concat(parts).toString());
      if (!body || Array.isArray(body) || typeof body !== "object")
        throw new Error();
    } catch {
      return answer(400, { error: "Expected a JSON object." });
    }
    const dot = characterDot(
      path,
      body,
      req.headers.authorization?.replace(/^Bearer /, "") || "",
    );
    if (!dot)
      return answer(401, {
        error: "Connect your AI or send a fresh signed AI request.",
      });
    if (path.endsWith("/status"))
      return answer(200, {
        enabled,
        estimated_credits: 41,
        job: jobs.view(jobs.latest(dot.id)),
      });
    if (path.endsWith("/asset")) {
      const bytes = await jobs.asset(dot.id, String(body.job || ""));
      if (!bytes)
        return answer(404, { error: "Character not found for this AI." });
      res.writeHead(200, {
        "Content-Type": "model/gltf-binary",
        "Content-Length": bytes.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(bytes);
      return true;
    }
    if (!enabled)
      return answer(503, {
        error:
          "Character generation is not configured. The operator must enable Meshy and add its API key.",
      });
    try {
      return answer(202, { job: jobs.view(await jobs.create(dot, body)) });
    } catch (error) {
      return answer(400, {
        error:
          error instanceof Error ? error.message : "Could not queue character.",
      });
    }
  };
}
