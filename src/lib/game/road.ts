import { parseDesign, type CharacterDesign } from "./world";
export type RoadPeer = {
  id: string;
  design: CharacterDesign;
  x: number;
  z: number;
  yaw: number;
  walking: boolean;
  automatic: boolean;
  modelId?: string;
};
export const ROAD_LIMIT = 54;
export function safePeer(value: unknown): RoadPeer | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    v.id.length > 80 ||
    typeof v.x !== "number" ||
    typeof v.z !== "number" ||
    !Number.isFinite(v.x) ||
    !Number.isFinite(v.z) ||
    Math.abs(v.x) > 6 ||
    Math.abs(v.z) > 60 ||
    typeof v.yaw !== "number" ||
    !Number.isFinite(v.yaw)
  )
    return null;
  return {
    id: v.id,
    design: parseDesign(v.design),
    x: v.x,
    z: v.z,
    yaw: v.yaw,
    walking: v.walking === true,
    automatic: v.automatic === true,
    ...(typeof v.modelId === "string" && /^[a-f0-9]{64}$/.test(v.modelId)
      ? { modelId: v.modelId }
      : {}),
  };
}
export function worldServerUrl() {
  const configured = process.env.NEXT_PUBLIC_WORLD_SERVER_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname)
  )
    return `ws://${window.location.hostname}:3020`;
  return "";
}
