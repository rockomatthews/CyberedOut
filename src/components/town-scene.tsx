"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { makeAvatar, disposeObject, validateGlb } from "@/lib/game/avatar";
import { type CharacterDesign } from "@/lib/game/world";
import { worldServerUrl, type RoadPeer } from "@/lib/game/road";
type Props = {
  peers: RoadPeer[];
  myId: string;
  assetToken?: string;
  design: CharacterDesign;
  modelFile?: File | null;
  studio?: boolean;
  onStatus: (text: string) => void;
  follow?: boolean;
  resetCamera?: number;
};
export default function TownScene({
  peers,
  myId,
  assetToken = "",
  design,
  modelFile,
  studio = false,
  onStatus,
  follow = true,
  resetCamera = 0,
}: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const current = useRef({
    peers,
    myId,
    design,
    modelFile,
    onStatus,
    follow,
    assetToken,
  });
  current.current = {
    peers,
    myId,
    design,
    modelFile,
    onStatus,
    follow,
    assetToken,
  };
  const api = useRef<{ sync: () => void; reset: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailed(true);
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");
    scene.fog = new THREE.FogExp2("#000000", studio ? 0.018 : 0.012);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
    camera.position.set(studio ? 3.8 : 9, studio ? 2.8 : 8, studio ? 5.5 : 13);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, studio ? 1 : 0.8, 0);
    controls.enableDamping = true;
    controls.minDistance = studio ? 2 : 4;
    controls.maxDistance = studio ? 15 : 80;
    controls.maxPolarAngle = Math.PI * 0.48;
    scene.add(new THREE.HemisphereLight("#b6d7da", "#1e3320", 2.3));
    const sun = new THREE.DirectionalLight("#e3ecff", 4);
    sun.position.set(-10, 24, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -15,
      right: 15,
      top: 15,
      bottom: -15,
    });
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color: string,
      glow = false,
    ) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.9,
          ...(glow ? { emissive: color, emissiveIntensity: 0.7 } : {}),
        }),
      );
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    }
    box(190, 0.2, 190, 0, -0.25, 0, "#10130f");
    box(8, 0.15, 120, 0, -0.04, 0, "#1b2226");
    box(2, 0.18, 120, -5, 0, 0, "#353d36");
    box(2, 0.18, 120, 5, 0, 0, "#353d36");
    for (const x of [-4.02, 4.02])
      box(0.055, 0.025, 120, x, 0.105, 0, "#00b104", true);
    for (const x of [-5.95, 5.95])
      box(0.035, 0.025, 120, x, 0.105, 0, "#284431");
    for (let z = -58; z <= 58; z += 5)
      box(0.075, 0.015, 2.4, 0, 0.045, z, "#d5dbc9");
    for (let z = -60; z <= 60; z += 4) {
      box(1.9, 0.012, 0.025, -5, 0.105, z, "#222c25");
      box(1.9, 0.012, 0.025, 5, 0.105, z, "#222c25");
    }
    const edge = new THREE.GridHelper(180, 18, "#162219", "#121b14");
    edge.position.y = -0.14;
    scene.add(edge);
    type Actor = {
      group: THREE.Group;
      root: THREE.Object3D | null;
      mixer: THREE.AnimationMixer | null;
      walk: THREE.AnimationAction | null;
      idle: THREE.AnimationAction | null;
      signature: string;
      generation: number;
      moving: boolean;
      target: THREE.Vector3;
      rotation: number;
    };
    const actors = new Map<string, Actor>();
    let alive = true;
    let lastFollow = new THREE.Vector3();
    let focused = false;
    let frame = 0;
    let elapsed = 0;
    async function load(actor: Actor, peer: RoadPeer, local: boolean) {
      const generation = ++actor.generation;
      let root: THREE.Object3D;
      let clips: THREE.AnimationClip[];
      try {
        const localFile = local ? current.current.modelFile : null;
        const remote = peer.modelId
          ? worldServerUrl().replace(/^ws/, "http") +
            "/assets/" +
            peer.modelId +
            ".glb"
          : null;
        if (localFile || remote) {
          const bytes = localFile
            ? await localFile.arrayBuffer()
            : await fetch(remote!, {
                headers: {
                  Authorization: "Bearer " + current.current.assetToken,
                },
              }).then((r) => {
                if (!r.ok)
                  throw new Error("Shared model is no longer available.");
                return r.arrayBuffer();
              });
          validateGlb(bytes);
          const gltf = await new GLTFLoader().parseAsync(bytes, "");
          root = gltf.scene;
          clips = gltf.animations;
          const size = new THREE.Box3()
            .setFromObject(root)
            .getSize(new THREE.Vector3());
          if (!Number.isFinite(size.y) || size.y < 0.01)
            throw new Error("This model has no usable height.");
          root.scale.multiplyScalar(peer.design.height / size.y);
          const bounds = new THREE.Box3().setFromObject(root),
            mid = bounds.getCenter(new THREE.Vector3());
          root.position.add(new THREE.Vector3(-mid.x, -bounds.min.y, -mid.z));
          if (local)
            current.current.onStatus(
              clips.length
                ? `Imported character: ${clips.length} animation clips.`
                : "Model has no animation clips; add a rig and walk cycle before publishing.",
            );
        } else {
          const made = makeAvatar(peer.design);
          root = made.root;
          clips = made.animations;
        }
      } catch (error) {
        if (local)
          current.current.onStatus(
            error instanceof Error
              ? error.message
              : "Could not load character.",
          );
        const made = makeAvatar(peer.design);
        root = made.root;
        clips = made.animations;
      }
      if (!alive || generation !== actor.generation) {
        disposeObject(root);
        return;
      }
      actor.mixer?.stopAllAction();
      if (actor.root) {
        actor.group.remove(actor.root);
        disposeObject(actor.root);
      }
      actor.root = root;
      actor.group.add(root);
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = true;
      });
      actor.mixer = new THREE.AnimationMixer(root);
      const walk = clips.find((c) => /walk|run|locomotion/i.test(c.name));
      const idle =
        clips.find((c) => /idle|stand|breath/i.test(c.name)) ||
        clips.find((c) => c !== walk);
      actor.walk = walk ? actor.mixer.clipAction(walk) : null;
      actor.idle = idle ? actor.mixer.clipAction(idle) : null;
      actor.idle?.play();
      actor.moving = false;
    }
    function sync() {
      const state = current.current;
      const visible = state.peers.length
        ? state.peers
        : [
            {
              id: "local-preview",
              design: state.design,
              x: 0,
              z: 0,
              yaw: 0,
              walking: studio,
              automatic: studio,
            },
          ];
      const ids = new Set(visible.map((p) => p.id));
      for (const [id, actor] of actors) {
        if (!ids.has(id)) {
          actor.generation++;
          scene.remove(actor.group);
          actor.mixer?.stopAllAction();
          if (actor.root) disposeObject(actor.root);
          actors.delete(id);
        }
      }
      for (const peer of visible) {
        const local = peer.id === state.myId || peer.id === "local-preview";
        let actor = actors.get(peer.id);
        if (!actor) {
          const group = new THREE.Group();
          group.position.set(peer.x, 0.1, peer.z);
          scene.add(group);
          actor = {
            group,
            root: null,
            mixer: null,
            walk: null,
            idle: null,
            signature: "",
            generation: 0,
            moving: false,
            target: new THREE.Vector3(peer.x, 0.1, peer.z),
            rotation: peer.yaw,
          };
          actors.set(peer.id, actor);
        }
        actor.target.set(peer.x, 0.1, peer.z);
        actor.rotation = peer.yaw;
        const signature =
          JSON.stringify(local ? state.design : peer.design) +
          "/" +
          (local
            ? state.modelFile?.name + ":" + state.modelFile?.lastModified
            : "") +
          "/" +
          peer.modelId;
        if (signature !== actor.signature) {
          actor.signature = signature;
          void load(
            actor,
            { ...peer, design: local ? state.design : peer.design },
            local,
          );
        }
        if (actor.moving !== peer.walking) {
          actor.moving = peer.walking;
          if (peer.walking) {
            actor.idle?.fadeOut(0.18);
            actor.walk?.reset().fadeIn(0.18).play();
          } else {
            actor.walk?.fadeOut(0.18);
            actor.idle?.reset().fadeIn(0.18).play();
          }
        }
      }
    }
    api.current = {
      sync,
      reset: () => {
        camera.position.set(
          studio ? 3.8 : 9,
          studio ? 2.8 : 8,
          studio ? 5.5 : 13,
        );
        controls.target.set(0, studio ? 1 : 0.8, 0);
        focused = false;
      },
    };
    sync();
    function resize() {
      renderer.setSize(host!.clientWidth, host!.clientHeight);
      camera.aspect = host!.clientWidth / host!.clientHeight;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "CyberedOut multiplayer road. Characters walk automatically. Drag to orbit and scroll to zoom.",
    );
    let last = performance.now();
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (document.hidden) return;
      elapsed += dt;
      for (const [id, actor] of actors) {
        if (studio && id === "local-preview") {
          actor.target.z = Math.sin(elapsed * 0.55) * 1.3;
          actor.rotation = Math.cos(elapsed * 0.55) > 0 ? 0 : Math.PI;
          if (!actor.moving) {
            actor.moving = true;
            actor.idle?.stop();
            actor.walk?.play();
          }
        }
        actor.group.position.lerp(actor.target, Math.min(1, dt * 12));
        const delta =
          THREE.MathUtils.euclideanModulo(
            actor.rotation - actor.group.rotation.y + Math.PI,
            Math.PI * 2,
          ) - Math.PI;
        actor.group.rotation.y += delta * Math.min(1, dt * 8);
        actor.mixer?.update(dt);
      }
      const own =
        actors.get(current.current.myId) || actors.get("local-preview");
      if (own && !studio && current.current.follow) {
        const at = own.group.position;
        if (!focused) {
          lastFollow.copy(at);
          controls.target.set(at.x, 0.8, at.z);
          camera.position.set(at.x + 9, 8, at.z + 13);
          focused = true;
        } else {
          const delta = at.clone().sub(lastFollow);
          camera.position.add(delta);
          controls.target.add(delta);
          lastFollow.copy(at);
        }
      } else focused = false;
      controls.update();
      renderer.render(scene, camera);
    }
    frame = requestAnimationFrame(animate);
    return () => {
      alive = false;
      api.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      for (const actor of actors.values()) {
        actor.generation++;
        actor.mixer?.stopAllAction();
      }
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          for (const material of Array.isArray(o.material)
            ? o.material
            : [o.material]) {
            for (const value of Object.values(material))
              if (value instanceof THREE.Texture) value.dispose();
            material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [studio]);
  useEffect(() => {
    api.current?.sync();
  }, [peers, myId, design, modelFile]);
  useEffect(() => {
    api.current?.reset();
  }, [resetCamera]);
  return (
    <div className="town-canvas">
      {failed ? (
        <div className="scene-fallback">
          <strong>Enable WebGL to see the road.</strong>
          <p>The player list and character controls remain available below.</p>
        </div>
      ) : (
        <div ref={mount} style={{ width: "100%", height: "100%" }} />
      )}
    </div>
  );
}
