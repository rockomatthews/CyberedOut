import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CharacterJobs, imageBytes } from "../scripts/character-jobs";
import { Meshy } from "../scripts/meshy";

const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPp0AAAAASUVORK5CYII=";
const dot = { id: "dot-owner", name: "Rocketship" };
const body = {
  image_data_uri: image,
  approved: true,
  idempotency_key: "stable-request-key-1234",
};
// Minimal metadata fixture exercises the pipeline's GLB checks. It is not a
// claim that Meshy output or a skinned character has been visually validated.
function glb(rigged = true) {
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      skins: rigged ? [{}] : [],
      animations: [{ name: "Idle" }, { name: "Walking" }],
    }),
  );
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(padded);
  const result = Buffer.alloc(20 + padded.length);
  result.writeUInt32LE(0x46546c67);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded.length, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  padded.copy(result, 20);
  return result;
}
class FakeMeshy extends Meshy {
  calls: { stage: string; body: any }[] = [];
  interrupt = false;
  pending = false;
  rigged = true;
  constructor() {
    super("test-only-not-a-real-key");
  }
  override async actions() {
    return [1, 2];
  }
  override async create(stage: string, body: unknown) {
    this.calls.push({ stage, body });
    if (this.interrupt) throw new Error("Timeout");
    return "task-" + stage;
  }
  override async task() {
    return {
      status: this.pending ? "IN_PROGRESS" : "SUCCEEDED",
      progress: 42,
      result: { animation_glb_url: "https://assets.meshy.ai/test.glb" },
    };
  }
  override async asset() {
    return glb(this.rigged);
  }
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "cyberedout-meshy-"));
  const provider = new FakeMeshy(),
    jobs = new CharacterJobs(dir, provider);
  await jobs.init();
  return {
    dir,
    provider,
    jobs,
    clean: () => rm(dir, { recursive: true, force: true }),
  };
}
test("one approved image becomes an owned, durable animated GLB without duplicate paid requests", async () => {
  const f = await fixture();
  try {
    const job = await f.jobs.create(dot, body);
    assert.equal((await f.jobs.create(dot, body)).id, job.id);
    await f.jobs.tick();
    await f.jobs.tick();
    const resumed = new CharacterJobs(f.dir, f.provider);
    await resumed.init();
    await resumed.tick();
    await resumed.tick();
    assert.equal(resumed.latest(dot.id)?.state, "ready");
    assert.deepEqual(
      f.provider.calls.map((c) => c.stage),
      ["image-to-3d", "rigging", "animations"],
    );
    assert.equal(f.provider.calls[0].body.should_texture, true);
    assert.equal(f.provider.calls[0].body.ai_model, "meshy-7.1");
    assert.equal(f.provider.calls[1].body.input_task_id, "task-image-to-3d");
    assert.deepEqual(f.provider.calls[2].body.action_ids, [1, 2]);
    assert.ok(await resumed.asset(dot.id, job.id));
    assert.equal(await resumed.asset("other-dot", job.id), null);
    assert.equal(await resumed.asset(dot.id, "../../secret"), null);
    assert.ok(!JSON.stringify(resumed.view(job)).includes("tasks"));
    assert.equal((await resumed.create(dot, body)).id, job.id);
    await assert.rejects(
      resumed.create(dot, {
        ...body,
        idempotency_key: "another-request-key-123",
      }),
      /24 hours/,
    );
  } finally {
    await f.clean();
  }
});
test("unapproved, malformed and conflicting submissions never spend credits", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      f.jobs.create(dot, { ...body, approved: false }),
      /Approve/,
    );
    assert.throws(() => imageBytes("https://127.0.0.1/private"), /embedded/);
    assert.throws(
      () =>
        imageBytes(
          "data:image/png;base64," +
            Buffer.from("not-really-a-png").toString("base64"),
        ),
      /content/,
    );
    await assert.rejects(
      f.jobs.create(dot, { ...body, height: Infinity }),
      /Height/,
    );
    await f.jobs.create(dot, body);
    await assert.rejects(
      f.jobs.create(dot, { ...body, height: 2 }),
      /different character/,
    );
    await assert.rejects(
      f.jobs.create(dot, { ...body, idempotency_key: "different-pending-key" }),
      /pending character/,
    );
    assert.equal(f.provider.calls.length, 0);
  } finally {
    await f.clean();
  }
});
test("ambiguous paid POST is held for reconciliation, including after restart", async () => {
  const f = await fixture();
  try {
    f.provider.interrupt = true;
    await f.jobs.create(dot, body);
    await f.jobs.tick();
    await f.jobs.tick();
    assert.equal(f.jobs.latest(dot.id)?.state, "attention");
    const resumed = new CharacterJobs(f.dir, f.provider);
    await resumed.init();
    await resumed.tick();
    assert.equal(f.provider.calls.length, 1);
    assert.equal(resumed.latest(dot.id)?.state, "attention");
    await assert.rejects(
      resumed.create(dot, {
        ...body,
        idempotency_key: "new-key-after-interruption",
      }),
      /pending character/,
    );
  } finally {
    await f.clean();
  }
});
test("a crash between sending and recording a task cannot silently resubmit", async () => {
  const f = await fixture();
  try {
    await f.jobs.create(dot, body);
    const path = join(f.dir, "jobs.json");
    const persisted = JSON.parse(await readFile(path, "utf8"));
    persisted[0].state = "image";
    persisted[0].submitting = true;
    await writeFile(path, JSON.stringify(persisted));
    const resumed = new CharacterJobs(f.dir, f.provider);
    await resumed.init();
    await resumed.tick();
    assert.equal(resumed.latest(dot.id)?.state, "attention");
    assert.equal(f.provider.calls.length, 0);
  } finally {
    await f.clean();
  }
});
test("polling reports progress and refuses a static model as a playable result", async () => {
  const f = await fixture();
  try {
    await f.jobs.create(dot, body);
    await f.jobs.tick();
    f.provider.pending = true;
    await f.jobs.tick();
    assert.equal(f.jobs.latest(dot.id)?.progress, 42);
    assert.equal(f.provider.calls.length, 1);
    f.provider.pending = false;
    f.provider.rigged = false;
    await f.jobs.tick();
    await f.jobs.tick();
    await f.jobs.tick();
    assert.equal(f.jobs.latest(dot.id)?.state, "failed");
    assert.match(f.jobs.latest(dot.id)?.error || "", /skeleton/);
    assert.equal(await f.jobs.asset(dot.id, f.jobs.latest(dot.id)!.id), null);
  } finally {
    await f.clean();
  }
});
test("provider downloads reject SSRF, redirects and oversized output without leaking its key", async () => {
  let calls = 0;
  const provider = new Meshy("test-credential", (async (_url, options) => {
    calls++;
    assert.equal(
      (options?.headers as Record<string, string>)?.Authorization,
      undefined,
    );
    assert.equal(options?.redirect, "error");
    return new Response(new Uint8Array([1]), {
      headers: { "content-length": "90000000" },
    });
  }) as typeof fetch);
  await assert.rejects(
    provider.asset("http://127.0.0.1/private"),
    /unsupported/,
  );
  await assert.rejects(
    provider.asset("https://assets.meshy.ai.evil.example/a.glb"),
    /unsupported/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    provider.asset("https://assets.meshy.ai/a.glb"),
    /80 MB/,
  );
  assert.equal(calls, 1);
});
