"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { makeAvatar, disposeObject, validateGlb } from "@/lib/game/avatar";
import { avatarFile } from "@/lib/game/storage";
import { MeshyCharacter } from "./meshy-character";
import { GENERATED_CHARACTER_KEY } from "@/lib/game/characters";
import { MAX_GLB_BYTES } from "@/lib/game/asset-limits";
import {
  defaultDesign,
  parseDesign,
  CHARACTER_KEY,
  ADMISSION_KEY,
  type CharacterDesign,
} from "@/lib/game/world";
const Scene = dynamic(() => import("./town-scene"), {
  ssr: false,
  loading: () => (
    <div className="town-canvas loading-scene">Loading your character…</div>
  ),
});

function saveFile(bytes: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CharacterStudio() {
  const [design, setDesign] = useState<CharacterDesign>(defaultDesign);
  const [model, setModel] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [importState, setImportState] = useState<
    "idle" | "reading" | "loading" | "ready" | "error"
  >("idle");
  const [importMessage, setImportMessage] = useState("");
  const preview = useRef<HTMLElement>(null);
  const scrollOnReady = useRef(false);
  const importing = importState === "reading" || importState === "loading";
  function showPreview() {
    preview.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    preview.current?.focus({ preventScroll: true });
  }
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setDesign(
        parseDesign(JSON.parse(localStorage.getItem(CHARACTER_KEY) || "null")),
      );
    } catch {}
    setReady(true);
    void avatarFile()
      .then(setModel)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(CHARACTER_KEY, JSON.stringify(design));
      } catch {
        setStatus("Browser storage is full. Export your brief to keep a copy.");
      }
  }, [design, ready]);
  function edit<K extends keyof CharacterDesign>(
    key: K,
    value: CharacterDesign[K],
  ) {
    setDesign((v) => ({ ...v, [key]: value }));
  }
  async function exportModel() {
    try {
      const made = makeAvatar(design);
      try {
        const data = await new GLTFExporter().parseAsync(made.root, {
          binary: true,
          animations: made.animations,
        });
        saveFile(
          data as ArrayBuffer,
          "cyberedout-starter.glb",
          "model/gltf-binary",
        );
        setStatus(
          "Starter GLB exported with Idle and Walk clips. This is the original starter model, not an AI-generated Meshy asset.",
        );
      } finally {
        disposeObject(made.root);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Export failed.");
    }
  }
  return (
    <>
      <div className="character-workbench">
        <section className="paper character-controls">
          <span className="eyebrow">01 / DESIGN YOUR IDENTITY</span>
          <h2>Give your AI a body.</h2>
          <p>
            Customize the playable starter, or give your AI one character image
            and generate a rigged, animated body below.
          </p>
          <TextField
            label="Character name"
            value={design.name}
            onChange={(e) => edit("name", e.target.value.slice(0, 32))}
            fullWidth
          />
          <TextField
            label="Useful role"
            value={design.role}
            onChange={(e) => edit("role", e.target.value.slice(0, 80))}
            fullWidth
          />
          <div className="color-fields">
            {(["body", "accent", "visor"] as const).map((key) => (
              <label key={key}>
                {key}
                <input
                  type="color"
                  aria-label={key + " color"}
                  value={design[key]}
                  onChange={(e) => edit(key, e.target.value)}
                />
              </label>
            ))}
          </div>
          <label className="select-label">
            Height: {design.height.toFixed(1)} m
            <input
              type="range"
              aria-label="Character height"
              min="1.2"
              max="2.4"
              step="0.1"
              value={design.height}
              onChange={(e) => edit("height", Number(e.target.value))}
            />
          </label>
          <TextField
            label="Codex character design brief"
            multiline
            rows={5}
            value={design.brief}
            onChange={(e) => edit("brief", e.target.value.slice(0, 3000))}
            fullWidth
          />
          <Button
            variant="outlined"
            onClick={() =>
              saveFile(
                JSON.stringify(
                  {
                    project: "CyberedOut",
                    ...design,
                    requirements: {
                      pose: "A-pose",
                      forward: "+Z",
                      targetHeightMeters: design.height,
                      format: "self-contained GLB",
                      animations: ["Idle", "Walk"],
                      budget: "50k triangles, textures 2K or lower",
                    },
                  },
                  null,
                  2,
                ),
                "cyberedout-character-brief.json",
                "application/json",
              )
            }
          >
            Export design brief
          </Button>
          <Button variant="contained" onClick={() => void exportModel()}>
            Export playable starter GLB
          </Button>
        </section>
        <section
          className="paper character-preview"
          ref={preview}
          tabIndex={-1}
          aria-label="Character movement preview"
        >
          <span className="eyebrow">LIVE MOVEMENT TEST</span>
          <h2>{design.name}</h2>
          <div className="character-stage">
            <Scene
              peers={[]}
              myId=""
              design={design}
              onStatus={setStatus}
              onModelState={(state, message) => {
                setImportState(state);
                setImportMessage(message);
                if (state === "ready" && scrollOnReady.current) {
                  scrollOnReady.current = false;
                  showPreview();
                }
              }}
              modelFile={model}
              studio
            />
          </div>
          {importMessage ? (
            <Alert
              severity={
                importState === "error"
                  ? "error"
                  : importState === "ready"
                    ? "success"
                    : "info"
              }
            >
              {importMessage}
            </Alert>
          ) : null}
          <div className="character-current">
            {model
              ? "Imported: " + model.name
              : "Original articulated starter · Idle + Walk"}
          </div>
          <p>
            Watch the character walk. An imported model needs a usable rig and
            animation clips for animated locomotion.
          </p>
          <Button
            variant="outlined"
            disabled={importing || (Boolean(model) && importState === "error")}
            onClick={() => {
              if (
                design.name.trim().length < 2 ||
                design.name.trim() === defaultDesign.name
              ) {
                setStatus(
                  "Choose your own character name before joining the road.",
                );
                return;
              }
              localStorage.setItem(CHARACTER_KEY, JSON.stringify(design));
              localStorage.setItem(ADMISSION_KEY, "1");
              window.location.assign("/town");
            }}
          >
            Save character and join the road
          </Button>
        </section>
      </div>
      {status ? (
        <Alert severity="info" className="panel-alert">
          {status}
        </Alert>
      ) : null}
      <MeshyCharacter
        height={design.height}
        onReady={(file, name) => {
          setModel(file);
          setDesign((current) => ({
            ...current,
            name: current.name === defaultDesign.name ? name : current.name,
          }));
        }}
      />
      <div className="character-imports">
        <section className="paper">
          <span className="eyebrow">ALREADY HAVE A MODEL?</span>
          <h2>Import your own GLB.</h2>
          <p>
            Bring an existing self-contained character with a skeleton and
            Idle/Walk animations, then test it above.
          </p>
          <label className="file-input">
            Import character GLB
            <input
              type="file"
              accept=".glb,model/gltf-binary"
              disabled={importing}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.currentTarget.value = "";
                setImportState("reading");
                setImportMessage(
                  `Importing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)…`,
                );
                try {
                  if (file.size > MAX_GLB_BYTES)
                    throw new Error("Use a GLB up to 80 MB.");
                  validateGlb(await file.arrayBuffer());
                  setImportMessage(`Saving ${file.name} on this device…`);
                  await avatarFile(file);
                  localStorage.removeItem(GENERATED_CHARACTER_KEY);
                  scrollOnReady.current = true;
                  setImportState("loading");
                  setImportMessage(
                    `Opening ${file.name} in the movement preview…`,
                  );
                  setModel(file);
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Could not import model.";
                  setImportState("error");
                  setImportMessage(message);
                  setStatus(message);
                }
              }}
            />
          </label>
          {importing ? (
            <LinearProgress aria-label="Importing character GLB" />
          ) : null}
          {importMessage ? (
            <Alert
              role="status"
              severity={
                importState === "error"
                  ? "error"
                  : importState === "ready"
                    ? "success"
                    : "info"
              }
            >
              {importMessage}
            </Alert>
          ) : null}
          {importState === "ready" ? (
            <Button variant="contained" onClick={showPreview}>
              View imported character
            </Button>
          ) : null}
          {model ? (
            <Button
              onClick={async () => {
                await avatarFile(null);
                localStorage.removeItem(GENERATED_CHARACTER_KEY);
                setModel(null);
                setImportState("idle");
                setImportMessage("");
                scrollOnReady.current = false;
                setStatus("Returned to your original starter character.");
              }}
            >
              Use starter character
            </Button>
          ) : null}
          <div className="notice">
            Manual import supports embedded, uncompressed GLB up to 80 MB. Check
            the movement test before using it on the road.
          </div>
          <a
            href="https://docs.meshy.ai/en/api/rigging"
            target="_blank"
            rel="noreferrer"
          >
            Meshy rigging requirements
          </a>
        </section>
      </div>
    </>
  );
}
