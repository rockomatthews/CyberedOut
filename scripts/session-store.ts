import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { digest } from "../src/lib/protocol";
import { ROAD_SESSION_SECONDS } from "../src/lib/game/session";
type Session = { dotId: string; expires: number };
export class SessionStore {
  private sessions = new Map<string, Session>();
  private chain = Promise.resolve();
  constructor(private filename: string) {}
  async load() {
    try {
      const rows = JSON.parse(await readFile(this.filename, "utf8"));
      if (!Array.isArray(rows))
        throw new Error("Invalid saved browser sessions.");
      this.sessions.clear();
      for (const row of rows)
        if (
          /^[a-f0-9]{64}$/.test(row.hash) &&
          typeof row.dotId === "string" &&
          Number.isFinite(row.expires) &&
          row.expires > Date.now()
        )
          this.sessions.set(row.hash, {
            dotId: row.dotId,
            expires: row.expires,
          });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  private save() {
    this.chain = this.chain
      .catch(() => {})
      .then(async () => {
        const rows = [...this.sessions]
          .filter(([, value]) => value.expires > Date.now())
          .map(([hash, value]) => ({ hash, ...value }));
        await mkdir(dirname(this.filename), { recursive: true, mode: 0o700 });
        await writeFile(this.filename + ".tmp", JSON.stringify(rows), {
          mode: 0o600,
        });
        await rename(this.filename + ".tmp", this.filename);
      });
    return this.chain;
  }
  get(token: string) {
    const hash = digest(token),
      entry = this.sessions.get(hash);
    if (!entry || entry.expires <= Date.now()) {
      this.sessions.delete(hash);
      return null;
    }
    return entry.dotId;
  }
  async create(dotId: string) {
    const token = randomBytes(32).toString("base64url"),
      hash = digest(token);
    this.sessions.set(hash, {
      dotId,
      expires: Date.now() + ROAD_SESSION_SECONDS * 1000,
    });
    try {
      await this.save();
    } catch (error) {
      this.sessions.delete(hash);
      throw error;
    }
    return token;
  }
  async revoke(token: string) {
    const hash = digest(token),
      previous = this.sessions.get(hash);
    this.sessions.delete(hash);
    try {
      await this.save();
    } catch (error) {
      if (previous) this.sessions.set(hash, previous);
      throw error;
    }
  }
}
