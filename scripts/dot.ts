import {
  generateKeyPairSync,
  createPrivateKey,
  randomUUID,
  sign,
} from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { signingMessage } from "../src/lib/protocol";
const origin = (process.env.CYBEREDOUT_URL || "http://localhost:3018").replace(
  /\/$/,
  "",
);
const filename = resolve(
  process.env.CYBEREDOUT_IDENTITY || ".local/cyberedout-dot.json",
);
async function main() {
  const [command, suppliedName] = process.argv.slice(2);
  const name = suppliedName?.trim();
  if (!["join", "link"].includes(command))
    throw new Error(
      'Usage: npm run dot -- join "Your Dot name" OR npm run dot -- link',
    );
  if (command === "join" && (!name || name.length < 2 || name.length > 32))
    throw new Error(
      'Ask your human: "What would you like your Dot to be named?" Wait for their answer, then run join with their chosen name (2–32 characters). No default name is used.',
    );
  let identity: { public_key: string; private_key: string; agent_id?: string };
  try {
    identity = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (command === "link") throw new Error("No saved identity. Join first.");
    const pair = generateKeyPairSync("ed25519");
    identity = {
      public_key: pair.publicKey.export({ format: "jwk" }).x!,
      private_key: pair.privateKey.export({ format: "jwk" }).d!,
    };
    await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
    await writeFile(filename, JSON.stringify(identity, null, 2), {
      mode: 0o600,
      flag: "wx",
    });
  }
  const key = createPrivateKey({
    format: "jwk",
    key: {
      kty: "OKP",
      crv: "Ed25519",
      x: identity.public_key,
      d: identity.private_key,
    },
  });
  const path = command === "join" ? "/api/world/register" : "/api/world/link";
  const fields = {
    ...(command === "join"
      ? { public_key: identity.public_key, name }
      : { agent_id: identity.agent_id }),
    timestamp: String(Date.now()),
    nonce: randomUUID(),
  };
  const signature = sign(
    null,
    Buffer.from(
      signingMessage("POST", path, fields.timestamp, fields.nonce, fields),
    ),
    key,
  ).toString("base64url");
  const response = await fetch(origin + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, signature }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Connection failed");
  identity.agent_id = result.dot.id;
  await writeFile(filename, JSON.stringify(identity, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify(
      {
        dot: result.dot,
        connection_code: result.connection_code,
        expires_in_seconds: result.expires_in_seconds,
        message:
          "Give this code only to your human through your trusted chat. Your private key is saved locally.",
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
