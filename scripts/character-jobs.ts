import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { validateGlb } from "../src/lib/game/avatar";
import { Meshy, MeshyAssetError } from "./meshy";

export type CharacterJob = {
  id: string;
  dotId: string;
  name: string;
  key: string;
  fingerprint: string;
  created: number;
  height: number;
  state:
    | "queued"
    | "image"
    | "rig"
    | "animation"
    | "download"
    | "ready"
    | "failed"
    | "attention";
  progress: number;
  actions: number[];
  tasks: Partial<Record<"image" | "rig" | "animation", string>>;
  submitting?: boolean;
  retryAt?: number;
  failures?: number;
  error?: string;
};
const endpoints = {
  image: "image-to-3d",
  rig: "rigging",
  animation: "animations",
};
export function imageBytes(uri: unknown) {
  if (typeof uri !== "string" || uri.length > 2_800_000)
    throw new Error("Choose a PNG, JPEG or WebP image up to 2 MB.");
  const match = uri.match(
    /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) throw new Error("Send an embedded PNG, JPEG or WebP image.");
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length > 2 * 1024 * 1024 ||
    bytes.length < 12 ||
    bytes.toString("base64") !== match[2]
  )
    throw new Error("Invalid image or image exceeds 2 MB.");
  const valid =
    match[1] === "png"
      ? bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : match[1] === "jpeg"
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!valid) throw new Error("Image content does not match its type.");
  return bytes;
}
export class CharacterJobs {
  private jobs: CharacterJob[] = [];
  private busy = false;
  private creating = false;
  private chain = Promise.resolve();
  constructor(
    private dir: string,
    private provider: Meshy,
    private dailyLimit = 10,
  ) {}
  async init() {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    try {
      this.jobs = JSON.parse(
        await readFile(join(this.dir, "jobs.json"), "utf8"),
      );
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    for (const job of this.jobs)
      if (job.submitting) {
        job.state = "attention";
        job.error =
          "A paid request was interrupted. The operator must reconcile its Meshy task before another attempt.";
      }
    await this.save();
  }
  private save() {
    this.chain = this.chain
      .catch(() => {})
      .then(async () => {
        const path = join(this.dir, "jobs.json");
        await writeFile(path + ".tmp", JSON.stringify(this.jobs), {
          mode: 0o600,
        });
        await rename(path + ".tmp", path);
      });
    return this.chain;
  }
  latest(dotId: string) {
    return this.jobs.filter((j) => j.dotId === dotId).at(-1) || null;
  }
  view(job: CharacterJob | null) {
    return job
      ? {
          id: job.id,
          dot_id: job.dotId,
          name: job.name,
          state: job.state,
          progress: job.progress,
          error: job.error,
          created: job.created,
          asset:
            job.state === "ready" ? "/api/character/asset?job=" + job.id : null,
        }
      : null;
  }
  async create(
    dot: { id: string; name: string },
    body: Record<string, unknown>,
  ) {
    if (body.approved !== true)
      throw new Error(
        "Approve sending this image to Meshy and spending API credits first.",
      );
    const bytes = imageBytes(body.image_data_uri);
    const key = String(body.idempotency_key || "");
    if (!/^[a-zA-Z0-9_-]{16,100}$/.test(key))
      throw new Error(
        "Use a stable idempotency key of 16–100 letters, digits, underscores or hyphens.",
      );
    const height = body.height === undefined ? 1.8 : Number(body.height);
    if (!Number.isFinite(height) || height < 1.2 || height > 2.4)
      throw new Error("Height must be 1.2–2.4 meters.");
    const fingerprint = createHash("sha256")
      .update(bytes)
      .update(String(height))
      .digest("hex");
    const same = this.jobs.find((j) => j.dotId === dot.id && j.key === key);
    if (same) {
      if (same.fingerprint !== fingerprint)
        throw new Error(
          "This idempotency key belongs to a different character.",
        );
      return same;
    }
    if (this.creating)
      throw new Error(
        "Another character is being queued. Retry with the same idempotency key.",
      );
    this.creating = true;
    try {
      if (
        this.jobs.some(
          (j) => j.dotId === dot.id && !["ready", "failed"].includes(j.state),
        )
      )
        throw new Error(
          "Your Dot already has a pending character. Check its progress first.",
        );
      const today = this.jobs.filter((j) => j.created > Date.now() - 86400000);
      if (
        today.length >= this.dailyLimit ||
        today.some((j) => j.dotId === dot.id)
      )
        throw new Error(
          "Character generation limit reached. Try after 24 hours.",
        );
      // Resolve current action IDs before starting a paid generation.
      const actions = await this.provider.actions();
      const job: CharacterJob = {
        id: randomUUID(),
        dotId: dot.id,
        name: dot.name,
        key,
        fingerprint,
        created: Date.now(),
        height,
        state: "queued",
        progress: 0,
        actions,
        tasks: {},
      };
      await writeFile(
        join(this.dir, job.id + ".image"),
        String(body.image_data_uri),
        { mode: 0o600, flag: "wx" },
      );
      this.jobs.push(job);
      try {
        await this.save();
      } catch (error) {
        this.jobs.pop();
        throw error;
      }
      return job;
    } finally {
      this.creating = false;
    }
  }
  async asset(dotId: string, id: string) {
    const job = this.jobs.find(
      (j) => j.id === id && j.dotId === dotId && j.state === "ready",
    );
    return job ? readFile(join(this.dir, job.id + ".glb")) : null;
  }
  private async submit(
    job: CharacterJob,
    stage: keyof typeof endpoints,
    body: unknown,
  ) {
    job.state = stage;
    job.submitting = true;
    job.progress = 0;
    await this.save();
    try {
      job.tasks[stage] = await this.provider.create(endpoints[stage], body);
      job.submitting = false;
      await this.save();
    } catch {
      // A timeout may happen after Meshy accepted/billed the request. Never
      // blindly retry POSTs; retain known task IDs for operator reconciliation.
      job.state = "attention";
      job.error =
        "Meshy submission was not confirmed. Check the Meshy dashboard before retrying; it may have consumed credits.";
      await this.save();
    }
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      for (const job of this.jobs) {
        if (["ready", "failed", "attention"].includes(job.state)) continue;
        if ((job.retryAt || 0) > Date.now()) continue;
        try {
          if (Date.now() - job.created > 6 * 3600000) {
            job.state = "failed";
            job.error =
              "Generation timed out. The operator can inspect saved task IDs in Meshy.";
            await this.save();
            continue;
          }
          if (job.state === "queued") {
            await this.submit(job, "image", {
              image_url: await readFile(
                join(this.dir, job.id + ".image"),
                "utf8",
              ),
              ai_model: "meshy-7.1",
              should_texture: true,
              texture_resolution: "2k",
              should_remesh: true,
              target_polycount: 30000,
              topology: "triangle",
              pose_mode: "a-pose",
              target_formats: ["glb"],
            });
            continue;
          }
          const stage =
            job.state === "download"
              ? "animation"
              : (job.state as keyof typeof endpoints);
          const task = await this.provider.task(
            endpoints[stage],
            job.tasks[stage]!,
          );
          if (["FAILED", "CANCELED", "CANCELLED"].includes(task.status)) {
            job.state = "failed";
            job.error =
              "Meshy could not complete this character. Check the task in the Meshy dashboard.";
          } else if (task.status === "SUCCEEDED") {
            if (stage === "image")
              await this.submit(job, "rig", {
                input_task_id: job.tasks.image,
                height_meters: job.height,
              });
            else if (stage === "rig")
              await this.submit(job, "animation", {
                rig_task_id: job.tasks.rig,
                action_ids: job.actions,
              });
            else {
              job.state = "download";
              const bytes = await this.provider.asset(
                task.result?.animation_glb_url || "",
              );
              let json;
              try {
                json = validateGlb(Uint8Array.from(bytes).buffer);
              } catch (error) {
                throw new MeshyAssetError(
                  error instanceof Error
                    ? error.message
                    : "Generated GLB is invalid.",
                );
              }
              if (
                !json.skins?.length ||
                !json.animations?.some((a: { name?: string }) =>
                  /walk/i.test(a.name || ""),
                ) ||
                !json.animations?.some((a: { name?: string }) =>
                  /idle/i.test(a.name || ""),
                )
              )
                throw new MeshyAssetError(
                  "Generated GLB is missing a skeleton, Idle, or Walk animation.",
                );
              const path = join(this.dir, job.id + ".glb");
              await writeFile(path + ".tmp", bytes, { mode: 0o600 });
              await rename(path + ".tmp", path);
              job.state = "ready";
              job.progress = 100;
              delete job.error;
            }
          } else {
            job.progress = Math.min(
              99,
              Math.max(0, Number(task.progress) || 0),
            );
          }
          job.failures = 0;
          delete job.retryAt;
          await this.save();
        } catch (error) {
          // GET/download retries do not create new billable jobs.
          if (error instanceof MeshyAssetError) job.state = "failed";
          else {
            job.failures = (job.failures || 0) + 1;
            job.retryAt =
              Date.now() +
              Math.min(300000, 10000 * 2 ** Math.min(job.failures, 5));
          }
          job.error =
            error instanceof Error ? error.message : "Waiting for Meshy.";
          await this.save();
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
