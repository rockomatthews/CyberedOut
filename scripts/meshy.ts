// Meshy credentials and provider URLs never leave the world service.
export type MeshyTask = {
  status: string;
  progress?: number;
  result?: { animation_glb_url?: string };
};
export class MeshyAssetError extends Error {}
export class Meshy {
  constructor(
    private key: string,
    private request: typeof fetch = fetch,
  ) {}
  async api(path: string, body?: unknown): Promise<any> {
    const response = await this.request(
      "https://api.meshy.ai/openapi/v1/" + path,
      {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: "Bearer " + this.key,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      },
    );
    // Do not echo provider responses: they can contain signed asset URLs.
    if (!response.ok)
      throw new Error(`Meshy request returned HTTP ${response.status}.`);
    return response.json();
  }
  async actions(): Promise<number[]> {
    const library = await this.api("animations/library");
    if (!Array.isArray(library))
      throw new Error("Meshy animation library is unavailable.");
    const idle = library.find((a) =>
      /^(idle|standing idle|breathing idle)$/i.test(a.name),
    );
    const walk = library.find((a) =>
      /^(walking|walk|walking forward)$/i.test(a.name),
    );
    if (
      !Number.isInteger(idle?.action_id) ||
      !Number.isInteger(walk?.action_id) ||
      idle.action_id === walk.action_id
    )
      throw new Error(
        "Standard Idle and Walk actions were not found. No generation was started.",
      );
    return [idle.action_id, walk.action_id];
  }
  async create(stage: string, body: unknown) {
    const data = await this.api(stage, body);
    if (
      typeof data.result !== "string" ||
      !data.result ||
      data.result.length > 200
    )
      throw new Error("Meshy did not return a task ID.");
    return data.result as string;
  }
  task(stage: string, id: string): Promise<MeshyTask> {
    return this.api(stage + "/" + encodeURIComponent(id));
  }
  async asset(url: string) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "assets.meshy.ai" ||
      parsed.port ||
      parsed.username ||
      parsed.password
    )
      throw new MeshyAssetError("Meshy returned an unsupported asset host.");
    const response = await this.request(url, {
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok || !response.body)
      throw new Error("Could not download the generated character.");
    const max = 20 * 1024 * 1024;
    if (Number(response.headers.get("content-length")) > max) {
      await response.body.cancel();
      throw new MeshyAssetError(
        "Generated character exceeds 20 MB. Optimize it before import.",
      );
    }
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > max)
          throw new MeshyAssetError(
            "Generated character exceeds 20 MB. Optimize it before import.",
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks);
  }
}
