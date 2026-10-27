"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { makeAvatar, disposeObject, validateGlb } from "@/lib/game/avatar";
import { avatarFile } from "@/lib/game/storage";
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
  const [concept, setConcept] = useState<string | null>(null);
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
          <h2>Give your Dot a body.</h2>
          <p>
            Start with the playable builder, or design concept art in Codex and
            bring back a rigged GLB from Meshy.
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
        <section className="paper character-preview">
          <span className="eyebrow">LIVE MOVEMENT TEST</span>
          <h2>{design.name}</h2>
          <div className="character-stage">
            <Scene
              peers={[]}
              myId=""
              design={design}
              onStatus={setStatus}
              modelFile={model}
              studio
            />
          </div>
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
      <div className="two-column character-imports">
        <section className="paper">
          <span className="eyebrow">02 / CONCEPT ART IN CODEX</span>
          <h2>Design before generating.</h2>
          <p>
            Use your brief to create an original full-body character in Codex.
            Ask for a clean A-pose, separated limbs, and a neutral background.
            Preview the concept here; it stays on this device.
          </p>
          <label className="file-input">
            Choose concept image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setStatus("Use a concept image smaller than 10 MB.");
                  return;
                }
                if (concept) URL.revokeObjectURL(concept);
                setConcept(URL.createObjectURL(file));
              }}
            />
          </label>
          {concept ? (
            <img
              className="concept-preview"
              src={concept}
              alt="Your local character concept"
            />
          ) : null}
        </section>
        <section className="paper">
          <span className="eyebrow">03 / MESHY TO PLAYABLE</span>
          <h2>Image. Mesh. Rig. Walk.</h2>
          <p>
            Convert your approved concept with Meshy Image to 3D, rig the
            humanoid, then add Idle and Walk animations. Export a self-contained
            GLB and test it here.
          </p>
          <label className="file-input">
            Import character GLB
            <input
              type="file"
              accept=".glb,model/gltf-binary"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  validateGlb(await file.arrayBuffer());
                  await avatarFile(file);
                  setModel(file);
                  setStatus(
                    "Model saved locally. Check the live movement test before using it.",
                  );
                } catch (error) {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : "Could not import model.",
                  );
                }
              }}
            />
          </label>
          {model ? (
            <Button
              onClick={async () => {
                await avatarFile(null);
                setModel(null);
                setStatus("Returned to your original starter character.");
              }}
            >
              Use starter character
            </Button>
          ) : null}
          <div className="notice">
            Meshy generation is not connected or running here. No credits are
            spent. Import supports embedded, uncompressed GLB up to 20 MB;
            provider output must be optimized and tested.
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
