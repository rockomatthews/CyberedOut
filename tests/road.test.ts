import test from "node:test";
import assert from "node:assert/strict";
import { parseDesign, defaultDesign } from "../src/lib/game/world";
import { safePeer } from "../src/lib/game/road";
import { makeAvatar, disposeObject, validateGlb } from "../src/lib/game/avatar";
test("character appearance is bounded and shares no arbitrary fields", () => {
  const design = parseDesign({
    name: "x".repeat(100),
    height: 100,
    body: "url(https://example.com)",
    accent: "#123456",
    privateToken: "never share",
  });
  assert.equal(design.name.length, 32);
  assert.equal(design.height, 2.4);
  assert.equal(design.body, defaultDesign.body);
  assert.equal(design.accent, "#123456");
  assert.equal("privateToken" in design, false);
});
test("road snapshots reject malformed and out-of-bounds positions", () => {
  assert.equal(safePeer({ id: "one", x: 0, z: 500, yaw: 0 }), null);
  assert.equal(safePeer({ id: "one", x: NaN, z: 0, yaw: 0 }), null);
  assert.equal(
    safePeer({
      id: "one",
      x: 0,
      z: 0,
      yaw: 0,
      design: defaultDesign,
      walking: true,
    })?.design.name,
    "Your Dot",
  );
});
test("starter is a real articulated model with walking and idle clips", () => {
  const avatar = makeAvatar(defaultDesign);
  try {
    assert.ok(avatar.root.getObjectByName("LeftLeg"));
    assert.ok(avatar.root.getObjectByName("RightArm"));
    assert.deepEqual(
      avatar.animations.map((c) => c.name),
      ["Idle", "Walk"],
    );
    assert.equal(avatar.animations[1].tracks.length, 4);
  } finally {
    disposeObject(avatar.root);
  }
});
function glb(metadata: object) {
  const json = JSON.stringify(metadata);
  const n = Math.ceil(Buffer.byteLength(json) / 4) * 4;
  const bytes = new ArrayBuffer(20 + n);
  const view = new DataView(bytes);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, 20 + n, true);
  view.setUint32(12, n, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(bytes, 20).fill(32);
  new Uint8Array(bytes, 20).set(Buffer.from(json));
  return bytes;
}
test("GLB imports block external asset references and malformed files", () => {
  assert.throws(() => validateGlb(new ArrayBuffer(10)));
  assert.throws(() =>
    validateGlb(
      glb({ buffers: [{ uri: "https://private.example/model.bin" }] }),
    ),
  );
  assert.throws(() =>
    validateGlb(glb({ extensionsRequired: ["KHR_draco_mesh_compression"] })),
  );
  assert.doesNotThrow(() =>
    validateGlb(glb({ asset: { version: "2.0" }, nodes: [] })),
  );
});
