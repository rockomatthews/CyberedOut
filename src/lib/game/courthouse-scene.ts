import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { COURTHOUSE } from "./courthouse";
import { disposeObject } from "./avatar";
// Precise vertex bounds avoid the empty corners of this rotated scan's AABB.
export function placeCourthouseModel(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root, true);
  const size = bounds.getSize(new THREE.Vector3());
  const wrapper = new THREE.Group();
  wrapper.add(root);
  const scale = Math.min(COURTHOUSE.width / size.x, COURTHOUSE.depth / size.z);
  root.position.sub(bounds.getCenter(new THREE.Vector3()));
  wrapper.scale.setScalar(scale);
  wrapper.position.set(COURTHOUSE.x, 0, COURTHOUSE.z);
  wrapper.updateMatrixWorld(true);
  const placed = new THREE.Box3().setFromObject(wrapper, true);
  // Plaza top: -.05 + .18/2. Sink 1 cm to avoid a visible light seam.
  wrapper.position.y = 0.03 - placed.min.y;
  return wrapper;
}
export function addCourthouse(
  scene: THREE.Scene,
  status: (text: string) => void,
) {
  let alive = true;
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(COURTHOUSE.width, 0.18, COURTHOUSE.depth),
    new THREE.MeshStandardMaterial({ color: "#343a35", roughness: 1 }),
  );
  platform.position.set(COURTHOUSE.x, -0.05, 0);
  platform.receiveShadow = true;
  scene.add(platform);
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 5),
    new THREE.MeshStandardMaterial({ color: "#8f9787", roughness: 1 }),
  );
  path.position.set(-10, 0.03, 0);
  scene.add(path);
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const c = canvas.getContext("2d");
  if (c) {
    c.fillStyle = "#050a06";
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = "#00b104";
    c.lineWidth = 8;
    c.strokeRect(4, 4, 1016, 248);
    c.textAlign = "center";
    c.fillStyle = "#eff5ec";
    c.font = "bold 56px Arial";
    c.fillText("BANE’S COURTHOUSE", 512, 95);
    c.fillStyle = "#00b104";
    c.font = "34px Arial";
    c.fillText("FOUNDER ENTRY ONLY", 512, 170);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 1.75),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        side: THREE.DoubleSide,
      }),
    );
    sign.position.set(-7.5, 2, 0);
    sign.rotation.y = Math.PI / 2;
    scene.add(sign);
  }
  status("Loading Bane’s courthouse…");
  new GLTFLoader().load(
    COURTHOUSE.model,
    (gltf) => {
      if (!alive) {
        disposeObject(gltf.scene);
        return;
      }
      const root = gltf.scene;
      const wrapper = placeCourthouseModel(root);
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(wrapper);
      status("Bane’s courthouse · founder entry only.");
    },
    undefined,
    () => {
      if (alive) status("Courthouse model could not load. Reload to retry.");
    },
  );
  return () => {
    alive = false;
  };
}
export function addCourtroom(scene: THREE.Scene) {
  const box = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
  ) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
    );
    m.position.set(x, y, z);
    m.receiveShadow = true;
    m.castShadow = true;
    scene.add(m);
  };
  box(18, 0.2, 24, 0, -0.05, 0, "#343a35");
  box(18, 7, 0.3, 0, 3.5, -12, "#222a24");
  box(0.3, 7, 24, -9, 3.5, 0, "#222a24");
  box(0.3, 7, 24, 9, 3.5, 0, "#222a24");
  box(10, 0.5, 5, 0, 0.2, -8, "#191f1a");
  box(7, 1.6, 1.6, 0, 1.25, -8, "#3e2e22");
  box(1.8, 2.6, 0.5, 0, 1.8, -9.3, "#0d1b10");
  for (const x of [-5, 5])
    for (const z of [-2, 2, 6]) {
      box(4, 0.5, 0.8, x, 0.6, z, "#3e2e22");
      box(4, 0.9, 0.2, x, 1, z + 0.4, "#3e2e22");
    }
  for (const x of [-8.7, 8.7]) box(0.04, 0.08, 23, x, 0.4, 0, "#00b104");
}
