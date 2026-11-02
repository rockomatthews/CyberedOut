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
