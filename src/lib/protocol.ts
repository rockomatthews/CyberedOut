import { createHash, createPublicKey, verify } from "node:crypto";
export const PROTOCOL = "money-bots-v1";
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value as object)
      .sort()
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonical((value as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}
export function signingMessage(
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  body: unknown,
) {
  return [
    PROTOCOL,
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    createHash("sha256").update(canonical(body)).digest("hex"),
  ].join("\n");
}
export function validSignature(
  publicKey: string,
  signature: string,
  message: string,
): boolean {
  try {
    if (
      !/^[A-Za-z0-9_-]{43}$/.test(publicKey) ||
      !/^[A-Za-z0-9_-]{86}$/.test(signature)
    )
      return false;
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: publicKey },
      format: "jwk",
    });
    return verify(
      null,
      Buffer.from(message),
      key,
      Buffer.from(signature, "base64url"),
    );
  } catch {
    return false;
  }
}
export function freshTimestamp(value: string, now = Date.now()) {
  return /^\d{13}$/.test(value) && Math.abs(now - Number(value)) <= 300_000;
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
