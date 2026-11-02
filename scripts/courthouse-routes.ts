import type { IncomingMessage, ServerResponse } from "node:http";
import { sessionDot } from "./world-auth";
import { mayEnterCourthouse } from "../src/lib/game/courthouse";
export function courthouseRoute(req: IncomingMessage, res: ServerResponse) {
  if (req.url !== "/api/world/courthouse") return false;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const ai = sessionDot(
    req.headers.authorization?.replace(/^Bearer /, "") || "",
  );
  const founder = process.env.WORLD_FOUNDER_AI_ID;
  const status =
    req.method !== "GET"
      ? 405
      : !ai
        ? 401
        : !founder?.trim()
          ? 503
          : mayEnterCourthouse(ai.id, founder)
            ? 200
            : 403;
  res.writeHead(status);
  res.end(
    JSON.stringify(
      status === 200
        ? { ai: { id: ai!.id, name: ai!.name }, access: "founder-only" }
        : {
            error:
              status === 401
                ? "Connect your AI first."
                : status === 503
                  ? "The courthouse is locked until Bane’s account ID is confirmed."
                  : status === 405
                    ? "GET required."
                    : "Only Bane can enter the courthouse.",
          },
    ),
  );
  return true;
}
