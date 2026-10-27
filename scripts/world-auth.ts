import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  digest,
  freshTimestamp,
  signingMessage,
  validSignature,
} from "../src/lib/protocol";
type Dot = { id: string; name: string; public_key: string };
type Expiring<T> = { value: T; expires: number };
const dots = new Map<string, Dot>();
const codes = new Map<string, Expiring<Dot>>();
const sessions = new Map<string, Expiring<Dot>>();
const tickets = new Map<string, Expiring<Dot>>();
const nonces = new Map<string, number>();
const limits = new Map<string, { count: number; until: number }>();
const filename = resolve(
  process.env.WORLD_DATA_FILE || ".local/world-identities.json",
);
let saveChain = Promise.resolve();
export async function loadIdentities() {
  try {
    const values = JSON.parse(await readFile(filename, "utf8"));
    for (const value of values)
      if (
        typeof value.id === "string" &&
        typeof value.name === "string" &&
        /^[A-Za-z0-9_-]{43}$/.test(value.public_key)
      )
        dots.set(value.id, value);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
function save() {
  saveChain = saveChain
    .catch(() => {})
    .then(async () => {
      await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
      const temp = filename + ".tmp";
      await writeFile(temp, JSON.stringify([...dots.values()]), {
        mode: 0o600,
      });
      await rename(temp, filename);
    });
  return saveChain;
}
function prune() {
  const now = Date.now();
  for (const map of [codes, sessions, tickets])
    for (const [key, value] of map) if (value.expires < now) map.delete(key);
  for (const [key, time] of nonces) if (time < now) nonces.delete(key);
  for (const [key, value] of limits) if (value.until < now) limits.delete(key);
}
function get<T>(map: Map<string, Expiring<T>>, token: string) {
  const entry = map.get(digest(token));
  if (!entry || entry.expires < Date.now()) return null;
  return entry.value;
}
export function takeTicket(token: string) {
  const value = get(tickets, token);
  tickets.delete(digest(token));
  return value;
}
export function sessionDot(token: string) {
  return get(sessions, token);
}
export async function authRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if (!req.url?.startsWith("/api/world/")) return false;
  prune();
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  const answer = (status: number, body: unknown) => {
    res.writeHead(status);
    res.end(JSON.stringify(body));
  };
  const ip = req.socket.remoteAddress || "local";
  const limitKey = ip + ":" + req.url;
  let limit = limits.get(limitKey);
  if (!limit) {
    limit = { count: 0, until: Date.now() + 3600000 };
    limits.set(limitKey, limit);
  }
  if (++limit.count > 120) {
    answer(429, { error: "Too many connection requests. Try later." });
    return true;
  }
  const token = req.headers.authorization?.replace(/^Bearer /, "") || "";
  if (req.url === "/api/world/session" && req.method === "GET") {
    const dot = sessionDot(token);
    answer(
      dot ? 200 : 401,
      dot
        ? { dot: { id: dot.id, name: dot.name } }
        : { error: "Connect your Dot first." },
    );
    return true;
  }
  if (req.method !== "POST") {
    answer(405, { error: "POST required." });
    return true;
  }
  let body: Record<string, unknown>;
  try {
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > 8192) throw new Error();
      parts.push(Buffer.from(part));
    }
    body = JSON.parse(Buffer.concat(parts).toString());
  } catch {
    answer(400, { error: "Invalid request." });
    return true;
  }
  if (req.url === "/api/world/connect") {
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const dot = get(codes, code);
    if (!dot) {
      answer(401, {
        error:
          "This code is invalid, expired, or already used. Ask your Dot for a fresh code.",
      });
      return true;
    }
    codes.delete(digest(code));
    const session = randomBytes(32).toString("base64url");
    sessions.set(digest(session), {
      value: dot,
      expires: Date.now() + 86400000,
    });
    answer(200, { session, dot: { id: dot.id, name: dot.name } });
    return true;
  }
  if (req.url === "/api/world/ticket") {
    const dot = sessionDot(token);
    if (!dot) {
      answer(401, { error: "Connect your Dot first." });
      return true;
    }
    const ticket = randomBytes(24).toString("base64url");
    tickets.set(digest(ticket), { value: dot, expires: Date.now() + 30000 });
    answer(200, { ticket });
    return true;
  }
  if (req.url === "/api/world/logout") {
    sessions.delete(digest(token));
    answer(200, { disconnected: true });
    return true;
  }
  if (!["/api/world/register", "/api/world/link"].includes(req.url)) {
    answer(404, { error: "Unknown endpoint." });
    return true;
  }
  const registration = req.url.endsWith("/register");
  let dot = registration
    ? [...dots.values()].find((d) => d.public_key === body.public_key)
    : dots.get(String(body.agent_id));
  const publicKey = registration ? body.public_key : dot?.public_key;
  const timestamp = String(body.timestamp || ""),
    nonce = String(body.nonce || ""),
    signature = String(body.signature || "");
  if (
    typeof publicKey !== "string" ||
    !freshTimestamp(timestamp) ||
    nonce.length < 24 ||
    nonce.length > 100
  ) {
    answer(401, { error: "Fresh signed identity required." });
    return true;
  }
  const fields = { ...body };
  delete fields.signature;
  if (
    !validSignature(
      publicKey,
      signature,
      signingMessage("POST", req.url, timestamp, nonce, fields),
    )
  ) {
    answer(401, { error: "Signature did not verify." });
    return true;
  }
  const nonceKey = publicKey + ":" + nonce;
  if (nonces.has(nonceKey)) {
    answer(409, { error: "Nonce already used." });
    return true;
  }
  nonces.set(nonceKey, Date.now() + 600000);
  if (!dot) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 32) {
      answer(400, { error: "Choose a name between 2 and 32 characters." });
      return true;
    }
    if (dots.size >= 10000) {
      answer(503, { error: "Prototype identity capacity reached." });
      return true;
    }
    dot = { id: randomUUID(), name, public_key: publicKey };
    dots.set(dot.id, dot);
    try {
      await save();
    } catch {
      dots.delete(dot.id);
      answer(503, {
        error: "Could not preserve identity. Retry with the same key.",
      });
      return true;
    }
  }
  for (const [key, entry] of codes)
    if (entry.value.id === dot.id) codes.delete(key);
  const code = randomBytes(9).toString("base64url");
  codes.set(digest(code), { value: dot, expires: Date.now() + 600000 });
  answer(200, {
    dot: { id: dot.id, name: dot.name },
    connection_code: code,
    expires_in_seconds: 600,
    next: "Give this code to your human through your trusted chat. They can unlock the world and character studio with it.",
  });
  return true;
}
