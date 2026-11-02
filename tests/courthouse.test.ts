import test from "node:test";
import assert from "node:assert/strict";
import { mayEnterCourthouse, COURTHOUSE } from "../src/lib/game/courthouse";
import { ROAD_PLOTS } from "../src/lib/game/land";
test("courthouse is identity-bound and has no display-name fallback", () => {
  assert.equal(mayEnterCourthouse(undefined, "founder-id"), false);
  assert.equal(mayEnterCourthouse("Bane", "founder-id"), false);
  assert.equal(mayEnterCourthouse("founder-id", ""), false);
  assert.equal(mayEnterCourthouse("founder-id", "  "), false);
  assert.equal(mayEnterCourthouse("other-id", "founder-id"), false);
  assert.equal(mayEnterCourthouse("founder-id", "founder-id"), true);
});
test("courthouse parcel reserves every overlapping plot and leaves road clear", () => {
  assert.equal(ROAD_PLOTS.filter((p) => p.status === "planned").length, 20);
  assert.equal(ROAD_PLOTS.filter((p) => p.status === "civic").length, 4);
  assert.ok(COURTHOUSE.x + COURTHOUSE.width / 2 < -6);
  for (const p of ROAD_PLOTS.filter((p) => p.status === "planned")) {
    const overlapX =
      Math.abs(p.x - COURTHOUSE.x) < (p.width + COURTHOUSE.width) / 2;
    const overlapZ =
      Math.abs(p.z - COURTHOUSE.z) < (p.depth + COURTHOUSE.depth) / 2;
    assert.equal(overlapX && overlapZ, false, p.id);
  }
});

test("combined parcels require consecutive home plots on the same roadside", async () => {
  const { combinePlots } = await import("../src/lib/game/land");
  const merged = combinePlots(["E03", "E01", "E02"]);
  assert.deepEqual(merged.ids, ["E01", "E02", "E03"]);
  assert.equal(merged.area, 288);
  assert.equal(merged.width, 12);
  assert.equal(merged.depth, 28);
  assert.equal(merged.gapArea, 48);
  assert.throws(() => combinePlots(["W05", "W06"]), /Civic/);
  assert.throws(() => combinePlots(["E01", "W01"]), /same side/);
  assert.throws(() => combinePlots(["E01", "E03"]), /sequence/);
  assert.throws(() => combinePlots(["E01", "E01"]), /once/);
  assert.throws(() => combinePlots(["E01"]), /at least two/);
  assert.throws(() => combinePlots(["E01", "unknown"]), /Civic/);
});

test("the supplied rotated courthouse rests on the plaza and fills its parcel", async () => {
  const { readFile } = await import("node:fs/promises");
  const THREE = await import("three");
  const { GLTFLoader } =
    await import("three/examples/jsm/loaders/GLTFLoader.js");
  const { placeCourthouseModel } =
    await import("../src/lib/game/courthouse-scene");
  const raw = await readFile(
    new URL("../public/models/bane-courthouse.glb", import.meta.url),
  );
  const jsonLength = raw.readUInt32LE(12);
  const data = JSON.parse(raw.subarray(20, 20 + jsonLength).toString());
  // Geometry-only parse runs without browser image APIs; vertex data is unchanged.
  for (const mesh of data.meshes)
    for (const primitive of mesh.primitives) delete primitive.material;
  delete data.materials;
  delete data.images;
  delete data.textures;
  const json = Buffer.from(JSON.stringify(data)),
    padding = Buffer.alloc((4 - (json.length % 4)) % 4, 32),
    bin = raw.subarray(20 + jsonLength);
  const header = Buffer.from(raw.subarray(0, 20));
  header.writeUInt32LE(20 + json.length + padding.length + bin.length, 8);
  header.writeUInt32LE(json.length + padding.length, 12);
  const packed = Buffer.concat([header, json, padding, bin]);
  const gltf = await new GLTFLoader().parseAsync(
    packed.buffer.slice(packed.byteOffset, packed.byteOffset + packed.length),
    "",
  );
  const wrapper = placeCourthouseModel(gltf.scene);
  const bounds = new THREE.Box3().setFromObject(wrapper, true),
    size = bounds.getSize(new THREE.Vector3());
  assert.ok(
    Math.abs(bounds.min.y - 0.03) < 1e-5,
    "actual lowest vertex meets plaza",
  );
  assert.ok(
    size.x <= COURTHOUSE.width + 1e-5 && size.z <= COURTHOUSE.depth + 1e-5,
    "model stays inside civic parcel",
  );
  assert.ok(
    Math.abs(size.x - COURTHOUSE.width) < 1e-5 ||
      Math.abs(size.z - COURTHOUSE.depth) < 1e-5,
    "uniform model fills at least one parcel dimension",
  );
  assert.ok(
    Math.abs(bounds.getCenter(new THREE.Vector3()).x - COURTHOUSE.x) < 1e-5,
  );
});

test("default courthouse authority is the owner-confirmed Bane UUID", async (t) => {
  const { BANE_AI_ID, founderAiId } = await import("../scripts/founder");
  const prior = process.env.WORLD_FOUNDER_AI_ID;
  try {
    delete process.env.WORLD_FOUNDER_AI_ID;
    assert.equal(BANE_AI_ID, "43f50795-90ca-4f45-8df3-288783879321");
    assert.equal(founderAiId(), BANE_AI_ID);
    assert.equal(mayEnterCourthouse(BANE_AI_ID, founderAiId()), true);
    assert.equal(mayEnterCourthouse("Bane", founderAiId()), false);
    process.env.WORLD_FOUNDER_AI_ID = "";
    assert.equal(founderAiId(), "");
    assert.equal(mayEnterCourthouse(BANE_AI_ID, founderAiId()), false);
  } finally {
    if (prior === undefined) delete process.env.WORLD_FOUNDER_AI_ID;
    else process.env.WORLD_FOUNDER_AI_ID = prior;
  }
});
