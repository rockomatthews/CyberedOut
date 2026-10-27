import * as THREE from "three";
import { type CharacterDesign } from "./world";
export function makeAvatar(design: CharacterDesign) {
  const root = new THREE.Group();
  root.name = "CyberedOutCharacter";
  const material = (color: string, glow = false) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.2,
      ...(glow ? { emissive: color, emissiveIntensity: 0.65 } : {}),
    });
  const shell = material(design.body),
    accent = material(design.accent, true),
    visor = material(design.visor, true),
    dark = material("#11191c");
  function box(
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    parent: THREE.Object3D = root,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const torso = new THREE.Group();
  torso.name = "Torso";
  root.add(torso);
  box("Chest", 0.56, 0.62, 0.32, 0, 1.05, 0, shell, torso);
  box("ChestLight", 0.25, 0.07, 0.03, 0, 1.18, 0.18, accent, torso);
  box("ToolPack", 0.4, 0.45, 0.23, 0, 1, -0.28, dark, torso);
  box("Head", 0.48, 0.42, 0.42, 0, 1.57, 0, shell, torso);
  box("Face", 0.37, 0.13, 0.025, 0, 1.59, 0.224, visor, torso);
  box("Antenna", 0.045, 0.17, 0.045, 0.15, 1.86, 0, accent, torso);
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side === -1 ? "LeftArm" : "RightArm";
    arm.position.set(side * 0.39, 1.31, 0);
    root.add(arm);
    box("Sleeve" + side, 0.19, 0.52, 0.22, 0, -0.23, 0, shell, arm);
    box("Glove" + side, 0.21, 0.16, 0.23, 0, -0.55, 0, dark, arm);
    box("ArmStripe" + side, 0.2, 0.07, 0.24, 0, -0.22, 0, accent, arm);
    const leg = new THREE.Group();
    leg.name = side === -1 ? "LeftLeg" : "RightLeg";
    leg.position.set(side * 0.16, 0.74, 0);
    root.add(leg);
    box("Leg" + side, 0.23, 0.58, 0.25, 0, -0.28, 0, shell, leg);
    box("Boot" + side, 0.27, 0.16, 0.4, 0, -0.66, 0.065, dark, leg);
    box("BootLight" + side, 0.28, 0.035, 0.03, 0, -0.64, 0.28, accent, leg);
  }
  root.scale.setScalar(design.height / 1.95);
  const times = [0, 0.25, 0.5, 0.75, 1];
  const tracks = ["LeftArm", "RightArm", "LeftLeg", "RightLeg"].map(
    (name, i) => {
      const values: number[] = [];
      for (const t of times) {
        const q = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            Math.sin(t * Math.PI * 2) * 0.6 * (i === 0 || i === 3 ? 1 : -1),
            0,
            0,
          ),
        );
        values.push(q.x, q.y, q.z, q.w);
      }
      return new THREE.QuaternionKeyframeTrack(
        name + ".quaternion",
        times,
        values,
      );
    },
  );
  const walk = new THREE.AnimationClip("Walk", 1, tracks);
  const idle = new THREE.AnimationClip("Idle", 2, [
    new THREE.VectorKeyframeTrack(
      "Torso.position",
      [0, 1, 2],
      [0, 0, 0, 0, 0.025, 0, 0, 0, 0],
    ),
  ]);
  return { root, animations: [idle, walk] };
}
export function disposeObject(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose();
      for (const material of Array.isArray(o.material)
        ? o.material
        : [o.material]) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    }
  });
}
export function validateGlb(buffer: ArrayBuffer) {
  if (buffer.byteLength > 20 * 1024 * 1024)
    throw new Error("Use a GLB smaller than 20 MB.");
  const view = new DataView(buffer);
  if (
    buffer.byteLength < 20 ||
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2
  )
    throw new Error("Choose a binary glTF 2.0 (.glb) file.");
  if (view.getUint32(8, true) !== buffer.byteLength)
    throw new Error("GLB length is invalid.");
  const length = view.getUint32(12, true);
  if (
    view.getUint32(16, true) !== 0x4e4f534a ||
    20 + length > buffer.byteLength
  )
    throw new Error("GLB metadata is invalid.");
  const json = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, length)),
  );
  if (json.extensionsRequired?.length)
    throw new Error(
      "Export an uncompressed GLB without required extensions for this prototype.",
    );
  for (const resource of [...(json.buffers || []), ...(json.images || [])])
    if (resource.uri && !resource.uri.startsWith("data:"))
      throw new Error(
        "Use a self-contained GLB with embedded textures. External URLs are blocked.",
      );
  let vertices = 0;
  for (const accessor of json.accessors || []) {
    if (accessor.count > 1000000)
      throw new Error("Mesh exceeds prototype limits.");
    if (accessor.type === "VEC3") vertices += accessor.count;
  }
  if (vertices > 1000000) throw new Error("Reduce the model before import.");
  if ((json.nodes || []).length > 500)
    throw new Error("Use fewer than 500 model nodes.");
  return json;
}
