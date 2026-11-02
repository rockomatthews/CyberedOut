import {
  generateKeyPairSync,
  createPrivateKey,
  randomUUID,
  sign,
  createHash,
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
  if (!["join", "link", "character", "character-status"].includes(command))
    throw new Error(
      'Usage: npm run ai -- join "Your AI name" | link | character "image.png" --approve-meshy | character-status',
    );
  if (command === "join" && (!name || name.length < 2 || name.length > 32))
    throw new Error(
      'Ask your human: "What would you like your AI to be named?" Wait for their answer, then run join with their chosen name (2–32 characters). No default name is used.',
    );
  let identity: { public_key: string; private_key: string; agent_id?: string };
  try {
    identity = JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (command !== "join") throw new Error("No saved identity. Join first.");
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
  if (command === "character" || command === "character-status") {
    if (!identity.agent_id)
      throw new Error(
        "Finish registering this AI first using its existing key.",
      );
    let payload: Record<string, unknown> = { agent_id: identity.agent_id };
    if (command === "character") {
      if (!suppliedName || !process.argv.includes("--approve-meshy"))
        throw new Error(
          "Get your human's approval to send their image to Meshy and spend generation credits, then run character with its image path and --approve-meshy.",
        );
      const bytes = await readFile(resolve(suppliedName));
      if (bytes.length > 2 * 1024 * 1024)
        throw new Error("Use an image up to 2 MB.");
      const mime = /\.png$/i.test(suppliedName)
        ? "png"
        : /\.jpe?g$/i.test(suppliedName)
          ? "jpeg"
          : /\.webp$/i.test(suppliedName)
            ? "webp"
            : "";
      if (!mime) throw new Error("Use PNG, JPEG or WebP.");
      payload = {
        ...payload,
        image_data_uri: `data:image/${mime};base64,${bytes.toString("base64")}`,
        approved: true,
        idempotency_key: createHash("sha256")
          .update(identity.public_key)
          .update(bytes)
          .digest("hex"),
      };
    }
    const action = command === "character" ? "create" : "status";
    const path = "/api/world/character/" + action;
    const fields = {
      ...payload,
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
    if (!response.ok)
      throw new Error(result.error || "Character request failed.");
    console.log(JSON.stringify(result, null, 2));
    return;
  }
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
