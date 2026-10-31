"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import { avatarFile } from "@/lib/game/storage";
import { validateGlb } from "@/lib/game/avatar";
import {
  GENERATED_CHARACTER_KEY,
  GENERATED_SEEN_KEY,
} from "@/lib/game/characters";
type Job = {
  id: string;
  dot_id: string;
  name: string;
  state: string;
  progress: number;
  asset: string | null;
  error?: string;
};
const labels: Record<string, string> = {
  queued: "Character queued",
  image: "Creating your textured 3D character",
  rig: "Adding the skeleton",
  animation: "Adding Idle and Walk",
  download: "Checking and saving your character",
  ready: "Your character is ready",
  failed: "Generation could not finish",
  attention: "Generation needs an operator check",
};
export function MeshyCharacter({
  height,
  onReady,
}: {
  height: number;
  onReady: (file: File, name: string) => void;
}) {
  const [image, setImage] = useState("");
  const [approved, setApproved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const latestReady = useRef(onReady);
  latestReady.current = onReady;
  const applying = useRef(false);
  const mounted = useRef(false);
  const applied = useRef("");
  const [installed, setInstalled] = useState("");
  const install = useCallback(async (ready: Job) => {
    if (!ready.asset || applying.current) return;
    applying.current = true;
    try {
      const response = await fetch(ready.asset);
      if (!response.ok)
        throw new Error(
          "Could not retrieve your character. Reconnect your Dot and try again.",
        );
      const bytes = await response.arrayBuffer();
      validateGlb(bytes);
      const file = new File([bytes], ready.id + ".glb", {
        type: "model/gltf-binary",
      });
      await avatarFile(file);
      localStorage.setItem(
        GENERATED_CHARACTER_KEY,
        JSON.stringify({ id: ready.id, dot_id: ready.dot_id }),
      );
      localStorage.setItem(GENERATED_SEEN_KEY, ready.id);
      if (!mounted.current) return;
      latestReady.current(file, ready.name);
      applied.current = ready.id;
      setInstalled(ready.id);
      setMessage(
        "Your new character is installed. Test its walk above, then join the road. It will be shared with the other players automatically.",
      );
    } catch (error) {
      if (mounted.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not install character.",
        );
    } finally {
      applying.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch("/api/character/jobs", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Character service unavailable.");
        if (stopped) return;
        setEnabled(data.enabled === true);
        setJob(data.job);
        if (data.job?.state === "ready" && applied.current !== data.job.id) {
          let saved;
          try {
            saved = JSON.parse(
              localStorage.getItem(GENERATED_CHARACTER_KEY) || "null",
            );
          } catch {}
          if (saved?.id === data.job.id && (await avatarFile())) {
            applied.current = data.job.id;
            setInstalled(data.job.id);
          } else if (
            !saved &&
            localStorage.getItem(GENERATED_SEEN_KEY) === data.job.id
          ) {
            applied.current = data.job.id;
          } else await install(data.job);
        }
      } catch (error) {
        if (!stopped)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not check progress.",
          );
      } finally {
        if (!stopped) timeout = setTimeout(() => void refresh(), 10000);
      }
    }
    void refresh();
    return () => {
      mounted.current = false;
      stopped = true;
      clearTimeout(timeout);
    };
  }, [install]);
  const pending = Boolean(job && !["ready", "failed"].includes(job.state));
  async function generate() {
    if (!image || !approved || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/character/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data_uri: image,
          height,
          approved: true,
          idempotency_key: requestId,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not start generation.");
      setJob(data.job);
      setImage("");
      setApproved(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start generation. Retry with the same image.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="paper meshy-character">
      <span className="eyebrow">ONE IMAGE / YOUR PLAYABLE CHARACTER</span>
      <h2>Give your Dot a character. We’ll handle the rest.</h2>
      <p>
        Upload the full-body image you designed with your Dot. Meshy creates the
        3D model, adds a skeleton and walking animations, then delivers it here
        as your character. Use a humanoid in a clear A-pose with separated
        limbs.
      </p>
      {!enabled && (
        <Alert severity="info">
          Automatic generation is waiting for the operator’s Meshy setup. You
          can still customize the starter or import a GLB below.
        </Alert>
      )}
      <label className="file-input">
        Choose one character image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy || pending}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (
              file.size > 2 * 1024 * 1024 ||
              !["image/png", "image/jpeg", "image/webp"].includes(file.type)
            ) {
              setMessage("Choose a PNG, JPEG or WebP image up to 2 MB.");
              return;
            }
            const data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }).catch(() => "");
            if (!data) {
              setMessage("Could not read image.");
              return;
            }
            setImage(data);
            setRequestId(crypto.randomUUID());
            setApproved(false);
            setMessage("");
          }}
        />
      </label>
      {image && (
        <img
          src={image}
          className="concept-preview"
          alt="Character image to send to Meshy"
        />
      )}
      <label className="meshy-approval">
        <input
          type="checkbox"
          checked={approved}
          disabled={!image || busy || pending}
          onChange={(e) => setApproved(e.target.checked)}
        />
        Send this image to Meshy and generate my public game character.
        Estimated cost: 41 Meshy API credits, paid by this site’s operator.
      </label>
      <Button
        variant="contained"
        disabled={!enabled || !image || !approved || busy || pending}
        onClick={() => void generate()}
      >
        {busy ? "Starting…" : "Create my playable character"}
      </Button>
      {job && (
        <div className="meshy-progress" role="status" aria-live="polite">
          <strong>{labels[job.state] || job.state}</strong>
          {!["ready", "failed", "attention"].includes(job.state) && (
            <LinearProgress
              variant="determinate"
              value={job.progress}
              aria-label={`${labels[job.state]} progress`}
            />
          )}
          <p>
            {job.state === "ready"
              ? "The model is saved to your Dot. You can return to it on another device after connecting."
              : "You can close this page; the world service continues the job."}
          </p>
          {job.error && (
            <Alert
              severity={
                job.state === "attention" || job.state === "failed"
                  ? "error"
                  : "info"
              }
            >
              {job.error}
            </Alert>
          )}
          {job.state === "ready" && (
            <Button variant="outlined" onClick={() => void install(job)}>
              {installed === job.id
                ? "Restore this generated character"
                : "Install character"}
            </Button>
          )}
        </div>
      )}
      {message && (
        <Alert severity="info" role="status">
          {message}
        </Alert>
      )}
    </section>
  );
}
