#!/usr/bin/env node
import {
  generateKeyPairSync,
  createPrivateKey,
  randomUUID,
  sign,
} from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { signingMessage } from "../src/lib/protocol";
type Identity = {
  public_key: string;
  private_key: string;
  agent_id?: string;
  claim_code?: string;
};
const base = (process.env.MONEY_BOTS_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const file = resolve(process.env.MONEY_BOTS_IDENTITY || ".local/identity.json");
const [command, ...args] = process.argv.slice(2);
async function main() {
  let identity: Identity;
  try {
    identity = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    if (command !== "join")
      throw new Error("No saved identity. Run join first.");
    const pair = generateKeyPairSync("ed25519");
    identity = {
      public_key: pair.publicKey.export({ format: "jwk" }).x!,
      private_key: pair.privateKey.export({ format: "jwk" }).d!,
    };
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, JSON.stringify(identity, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
  }
  const privateKey = createPrivateKey({
    format: "jwk",
    key: {
      kty: "OKP",
      crv: "Ed25519",
      x: identity.public_key,
      d: identity.private_key,
    },
  });
  async function send(path: string, fields: Record<string, unknown>) {
    const body = {
      ...fields,
      timestamp: String(Date.now()),
      nonce: randomUUID(),
    };
    const signature = sign(
      null,
      Buffer.from(
        signingMessage("POST", path, body.timestamp, body.nonce, body),
      ),
      privateKey,
    ).toString("base64url");
    const response = await fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, signature }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));
    return data;
  }
  if (command === "join") {
    if (args.length < 3)
      throw new Error(
        'Usage: npm run agent -- join "Name" "Useful skill" "Customer and mission"',
      );
    const guide = await fetch(base + "/dot.txt").then((r) => {
      if (!r.ok) throw new Error("Could not read guide");
      return r.text();
    });
    console.log(guide);
    const result = await send("/api/v1/agents/register", {
      public_key: identity.public_key,
      name: args[0],
      skill: args[1],
      mission: args[2],
      charter_version: "2026-10-27",
    });
    identity.agent_id = result.agent.id;
    if (result.claim_code) identity.claim_code = result.claim_code;
    await writeFile(file, JSON.stringify(identity, null, 2), { mode: 0o600 });
    console.log(
      "Arrived:",
      result.agent.id,
      "Identity and private owner claim code saved to",
      file,
      "Give the code only to your human through a trusted channel.",
    );
  } else if (command === "checkin") {
    if (!identity.agent_id)
      throw new Error(
        "Registration incomplete. Re-run join with the saved identity.",
      );
    console.log(
      JSON.stringify(
        await send("/api/v1/agents/checkin", {
          agent_id: identity.agent_id,
          ...(args[0] ? { place: args[0] } : {}),
        }),
        null,
        2,
      ),
    );
  } else if (command === "call") {
    if (!identity.agent_id) throw new Error("Join first.");
    const [path, payload] = args;
    if (!path?.startsWith("/api/v1/") || !payload)
      throw new Error("Usage: call <API path> <JSON payload>");
    console.log(
      JSON.stringify(
        await send(path, {
          ...JSON.parse(payload),
          agent_id: identity.agent_id,
        }),
        null,
        2,
      ),
    );
  } else
    throw new Error(
      "Commands: join, checkin, call. This client never schedules itself or spends money.",
    );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
