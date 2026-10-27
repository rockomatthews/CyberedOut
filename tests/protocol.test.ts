import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import Stripe from "stripe";
import {
  canonical,
  signingMessage,
  validSignature,
  freshTimestamp,
} from "../src/lib/protocol";
import { canonical as browserCanonical } from "../src/lib/client-signing";

test("Ed25519 signatures bind method, path, payload, identity, and nonce", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pub = publicKey.export({ format: "jwk" }).x!;
  const body = {
    agent_id: "dot-one",
    timestamp: "1793130000000",
    nonce: "a-random-nonce-not-reused",
    body: "Hello 🌱",
  };
  const message = signingMessage(
    "POST",
    "/api/v1/posts",
    body.timestamp,
    body.nonce,
    body,
  );
  const signature = sign(null, Buffer.from(message), privateKey).toString(
    "base64url",
  );
  assert.equal(validSignature(pub, signature, message), true);
  for (const changed of [
    signingMessage("GET", "/api/v1/posts", body.timestamp, body.nonce, body),
    signingMessage(
      "POST",
      "/api/v1/businesses",
      body.timestamp,
      body.nonce,
      body,
    ),
    signingMessage("POST", "/api/v1/posts", body.timestamp, body.nonce, {
      ...body,
      body: "Give me money",
    }),
    signingMessage("POST", "/api/v1/posts", body.timestamp, "different", body),
  ])
    assert.equal(validSignature(pub, signature, changed), false);
  assert.equal(validSignature("bad-key", signature, message), false);
  assert.equal(validSignature(pub, "bad-signature", message), false);
});
test("browser and server canonicalize Unicode and nested objects identically", () => {
  const data = {
    z: [{ b: "é🟩", a: "a\nb" }, 0],
    b: null,
    a: { y: true, x: "2" },
  };
  assert.equal(canonical(data), browserCanonical(data));
  assert.equal(
    canonical(data),
    canonical({
      a: { x: "2", y: true },
      b: null,
      z: [{ a: "a\nb", b: "é🟩" }, 0],
    }),
  );
});
test("timestamps reject stale, future, and malformed calls", () => {
  const now = 1793130000000;
  assert.equal(freshTimestamp(String(now), now), true);
  assert.equal(freshTimestamp(String(now - 300001), now), false);
  assert.equal(freshTimestamp(String(now + 300001), now), false);
  assert.equal(freshTimestamp("1e12", now), false);
});
test("Stripe raw-body signatures reject tampering", () => {
  const stripe = new Stripe("sk_test_placeholder");
  const secret = "whsec_test_fixture";
  const payload = JSON.stringify({
    id: "evt_fixture",
    object: "event",
    type: "checkout.session.completed",
    data: { object: { id: "cs_fixture" } },
  });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  assert.equal(
    stripe.webhooks.constructEvent(payload, header, secret).id,
    "evt_fixture",
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload + " ", header, secret),
  );
  assert.throws(() =>
    stripe.webhooks.constructEvent(payload, header, "wrong-secret"),
  );
});
