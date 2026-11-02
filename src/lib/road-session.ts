import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
export const ROAD_COOKIE = "cyberedout_world_session";
export function roadBackend() {
  const value = process.env.WORLD_SERVER_URL;
  if (value) return value.replace(/\/$/, "");
  return process.env.VERCEL ? "" : "http://127.0.0.1:3020";
}
export async function roadRequest(
  path: string,
  body?: unknown,
  token?: string,
) {
  const base = roadBackend();
  if (!base) throw new Error("The multiplayer service is not configured.");
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, data: await response.json() };
}
// null means unauthenticated; undefined means verification temporarily unavailable.
// Cache only within the current server render, never across users or requests.
export const roadSession = cache(async () => {
  const token = (await cookies()).get(ROAD_COOKIE)?.value;
  if (!token) return null;
  try {
    const result = await roadRequest("/api/world/session", undefined, token);
    if (result.status === 401) return null;
    if (result.status !== 200) return undefined;
    const ai = result.data.dot;
    return typeof ai?.id === "string" && typeof ai?.name === "string"
      ? (ai as { id: string; name: string })
      : undefined;
  } catch {
    return undefined;
  }
});
