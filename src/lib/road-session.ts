import "server-only";
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
export async function roadSession() {
  const token = (await cookies()).get(ROAD_COOKIE)?.value;
  if (!token) return null;
  try {
    const result = await roadRequest("/api/world/session", undefined, token);
    return result.status === 200
      ? (result.data.dot as { id: string; name: string })
      : null;
  } catch {
    return null;
  }
}
