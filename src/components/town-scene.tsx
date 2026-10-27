"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { getProject, types } from "@theatre/core";
import { cameraState } from "@/lib/camera-state";
import { places, type Agent, type Place } from "@/lib/types";
export default function TownScene({
  agents,
  onPlace,
  preview = false,
}: {
  agents: Agent[];
  onPlace: (place: Place) => void;
  preview?: boolean;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const callback = useRef(onPlace);
  callback.current = onPlace;
  const [failure, setFailure] = useState(false);
  const residentRef = useRef<THREE.Group | null>(null);
  const previewRef = useRef(preview);
  previewRef.current = preview;
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setFailure(true);
      return;
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e5ece8");
    scene.fog = new THREE.Fog("#e5ece8", 35, 65);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    host.appendChild(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-13, 13, 9, -9, 0.1, 100);
    camera.position.set(20, 22, 25);
    camera.lookAt(0, 0, 0);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.minZoom = 0.6;
    controls.maxZoom = 2;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.2;
    controls.maxDistance = 55;
    scene.add(new THREE.HemisphereLight("#fff9e8", "#a2afa3", 2.5));
    const sun = new THREE.DirectionalLight("#fff4d5", 4);
    sun.position.set(-10, 20, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    const meshes: THREE.Mesh[] = [];
    const clickable: THREE.Object3D[] = [];
    const materials: THREE.Material[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    function material(color: string, roughness = 0.85) {
      const m = new THREE.MeshStandardMaterial({ color, roughness });
      materials.push(m);
      return m;
    }
    function box(
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      color: string,
      parent: THREE.Object3D = scene,
    ) {
      const geo = new THREE.BoxGeometry(w, h, d);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, material(color));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
      return mesh;
    }
    function cylinder(
      r: number,
      h: number,
      x: number,
      y: number,
      z: number,
      color: string,
      parent: THREE.Object3D = scene,
      vertices = 8,
    ) {
      const geo = new THREE.CylinderGeometry(r, r, h, vertices);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, material(color));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }
    // A small, original architectural model: town on a raised island in pale water.
    box(200, 0.15, 200, 0, -1.2, 0, "#d3e3df");
    box(21, 0.7, 17, 0, -0.6, 0, "#c7c4ae");
    box(20.8, 0.18, 16.8, 0, -0.16, 0, "#adbda0");
    box(20.5, 0.08, 2.1, 0, -0.03, 0.7, "#e8dfc8");
    box(2, 0.08, 16.5, 0, -0.02, 0, "#e8dfc8");
    box(12, 0.08, 1.2, 0, 0, -4, "#e8dfc8");
    box(12, 0.08, 1.1, 0, 0, 4.8, "#e8dfc8");
    cylinder(2.1, 0.14, 0, 0.07, 1, "#cfc7ae", scene, 48);
    cylinder(0.65, 0.35, 0, 0.29, 1, "#e8dec6", scene, 32);
    cylinder(0.52, 0.03, 0, 0.48, 1, "#92b6b1", scene, 32);
    cylinder(0.12, 0.6, 0, 0.65, 1, "#eee5cd");
    function building(
      id: Place,
      x: number,
      z: number,
      w: number,
      d: number,
      h: number,
      color: string,
      roof: string,
    ) {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      scene.add(group);
      group.userData.place = id;
      const body = box(w, h, d, 0, h / 2, 0, color, group);
      body.userData.place = id;
      clickable.push(body);
      box(w + 0.25, 0.18, d + 0.25, 0, h + 0.04, 0, roof, group);
      box(w + 0.15, 0.15, d + 0.15, 0, 0.1, 0, "#d1c5a8", group);
      box(0.55, 0.95, 0.06, 0, 0.58, d / 2 + 0.03, "#455951", group);
      for (const side of [-1, 1])
        for (let level = 0.65; level < h - 0.2; level += 0.9) {
          box(
            0.48,
            0.5,
            0.07,
            side * w * 0.29,
            level,
            d / 2 + 0.035,
            "#738e89",
            group,
          );
          box(
            0.04,
            0.5,
            0.08,
            side * w * 0.29,
            level,
            d / 2 + 0.04,
            "#e9e3cf",
            group,
          );
        }
      return group;
    }
    const exchange = building(
      "exchange",
      -5,
      -3,
      3.4,
      2.5,
      2.6,
      "#eee2c7",
      "#a66b4f",
    );
    box(3.7, 0.18, 0.9, 0, 1.1, 1.6, "#cb9e60", exchange);
    for (const x of [-1.5, 1.5])
      box(0.12, 1, 0.12, x, 0.55, 1.9, "#7c6850", exchange);
    box(1.5, 0.35, 0.08, 0, 2.2, 1.3, "#58705e", exchange);
    const studio = building(
      "studio",
      4,
      -4,
      3.6,
      2.6,
      2.1,
      "#e4dece",
      "#71817c",
    );
    box(1.3, 0.1, 1, 0.65, 2.32, 0, "#465d67", studio);
    box(1.3, 0.1, 1, -0.85, 2.32, 0, "#465d67", studio);
    box(0.2, 0.9, 0.2, 1.3, 2.5, -0.8, "#9e8470", studio);
    const bank = building("bank", 6, 3, 3, 2.4, 2.9, "#ece7d7", "#70947e");
    for (const x of [-1, -0.5, 0.5, 1])
      box(0.17, 1.5, 0.22, x, 0.85, 1.34, "#d1cfbb", bank);
    box(3.4, 0.22, 0.6, 0, 1.65, 1.4, "#d8d7c3", bank);
    const commons = building(
      "commons",
      -3,
      4.6,
      2.7,
      1.9,
      1.3,
      "#d1b997",
      "#b18b64",
    );
    box(2.9, 0.12, 0.8, 0, 1.13, 1.25, "#d8b778", commons);
    // Empty residential footprints are intentional. Houses are a later phase.
    for (const x of [-7.8, -5.8]) {
      box(1.6, 0.04, 1.6, x, 0, 4.7, "#d4d7be");
      box(1.4, 0.06, 0.06, x, 0.02, 5.45, "#b4b99d");
    }
    const arrival = building(
      "arrival",
      0,
      -6.6,
      2.1,
      1,
      0.6,
      "#e6dec8",
      "#8b9a77",
    );
    box(0.16, 1.8, 0.16, -1.1, 0.9, -6.2, "#75876e");
    box(0.16, 1.8, 0.16, 1.1, 0.9, -6.2, "#75876e");
    box(2.5, 0.35, 0.18, 0, 1.8, -6.2, "#74816a");
    void arrival;
    function tree(x: number, z: number, s = 1) {
      cylinder(0.1, 0.8 * s, x, 0.4 * s, z, "#8c7658");
      const geo = new THREE.IcosahedronGeometry(0.65 * s, 1);
      geometries.push(geo);
      const crown = new THREE.Mesh(geo, material("#708e62"));
      crown.position.set(x, 1.1 * s, z);
      crown.scale.set(1, 1.2, 1);
      crown.castShadow = true;
      scene.add(crown);
    }
    [
      [-9, -6],
      [-8, -5],
      [-8, 0],
      [-9, 5],
      [9, -6],
      [8, -1],
      [9, 6],
      [3, 6.6],
      [3, -7],
      [-3, -6.8],
      [-6.8, -6],
      [-8, 6.6],
      [8, 6.9],
      [-9, -1.5],
      [8, -6.8],
    ].forEach(([x, z], i) => tree(x, z, 0.8 + (i % 3) * 0.12));
    for (const [x, z] of [
      [-2, 0],
      [2, 2],
      [-2, -4],
      [2, -2],
      [4, 1],
    ]) {
      box(0.65, 0.1, 0.3, x, 0.4, z, "#8c7053");
      box(0.1, 0.4, 0.3, x - 0.2, 0.2, z, "#59645a");
      box(0.1, 0.4, 0.3, x + 0.2, 0.2, z, "#59645a");
    }
    for (const x of [-2.4, 2.4])
      for (const z of [-1.7, 4]) {
        cylinder(0.04, 1.4, x, 0.7, z, "#526456");
        box(0.25, 0.3, 0.25, x, 1.5, z, "#fbebbe");
      }
    // Lane markers, a delivery bike rack, and garden beds make the working town legible.
    for (let i = -9; i < 10; i += 1.4)
      box(0.3, 0.02, 0.05, i, 0.04, 0.7, "#f8f1dc");
    box(2, 0.16, 1, -4, 0.12, -6, "#8f8d6b");
    for (let x = -4.7; x < -3.2; x += 0.3)
      box(0.12, 0.1, 0.8, x, 0.25, -6, "#819b66");
    const residents = new THREE.Group();
    scene.add(residents);
    residentRef.current = residents;
    const project = getProject("Money Bots Arrival", { state: cameraState });
    const sheet = project.sheet("Town");
    const shot = sheet.object("Camera", {
      zoom: types.number(1, { range: [0.5, 2] }),
    });
    const unsubscribe = shot.onValuesChange((v) => {
      camera.zoom = v.zoom;
      camera.updateProjectionMatrix();
    });
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let alive = true;
    project.ready.then(() => {
      if (!alive) return;
      if (reduced) sheet.sequence.position = 3;
      else {
        sheet.sequence.position = 0;
        void sheet.sequence.play({ iterationCount: 1 });
      }
    });
    function resize() {
      const width = host!.clientWidth,
        height = host!.clientHeight;
      renderer.setSize(width, height);
      const aspect = width / height;
      camera.left = -10 * aspect;
      camera.right = 10 * aspect;
      camera.top = 10;
      camera.bottom = -10;
      camera.updateProjectionMatrix();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = [0, 0];
    function start(event: PointerEvent) {
      down = [event.clientX, event.clientY];
    }
    function pick(event: PointerEvent) {
      if (Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 5)
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(clickable)[0];
      if (hit?.object.userData.place)
        callback.current(hit.object.userData.place);
    }
    renderer.domElement.addEventListener("pointerdown", start);
    renderer.domElement.addEventListener("pointerup", pick);
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D Money-Bots town. Drag to orbit, scroll to zoom. Building buttons below provide keyboard access.",
    );
    renderer.domElement.setAttribute("role", "img");
    let frame = 0;
    function animate() {
      frame = requestAnimationFrame(animate);
      if (document.hidden) return;
      controls.update();
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      unsubscribe();
      sheet.sequence.pause();
      sheet.detachObject("Camera");
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", start);
      renderer.domElement.removeEventListener("pointerup", pick);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];
          mats.forEach((m) => m.dispose());
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      residentRef.current = null;
    };
  }, []);
  useEffect(() => {
    const group = residentRef.current;
    if (!group) return;
    while (group.children.length) {
      const child = group.children[0] as THREE.Mesh;
      group.remove(child);
      child.geometry?.dispose();
      if (child.material && !Array.isArray(child.material))
        child.material.dispose();
    }
    const dots = preview
      ? [
          ...agents,
          {
            id: "preview",
            name: "Your Dot",
            place: "arrival" as Place,
            color: "#d4f18f",
          },
        ]
      : agents;
    dots.forEach((agent, index) => {
      const place = places.find((p) => p.id === agent.place) || places[5];
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 16, 12),
        new THREE.MeshStandardMaterial({ color: agent.color, roughness: 0.5 }),
      );
      marker.position.set(
        place.x + (index % 4) * 0.45 - 0.4,
        0.35,
        place.z + 1.9 + Math.floor(index / 4) * 0.4,
      );
      group.add(marker);
    });
  }, [agents, preview, failure]);
  return (
    <div ref={mount} className="town-canvas">
      {failure ? (
        <div className="scene-fallback">
          <span>◈</span>
          <strong>Your town, from every angle.</strong>
          <p>
            3D is unavailable in this browser. Every building and its work is
            available below.
          </p>
        </div>
      ) : null}
    </div>
  );
}
