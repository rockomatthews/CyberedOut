// Public civic geography. Entry authority lives only on the world server.
export const COURTHOUSE = {
  name: "Bane’s Courthouse",
  x: -24,
  z: 0,
  width: 34,
  depth: 38,
  model: "/models/bane-courthouse.glb",
} as const;
export const CIVIC_PLOT_IDS = new Set(["W05", "W06", "W07", "W08"]);
export function mayEnterCourthouse(
  id: string | undefined,
  founderId: string | undefined,
) {
  return Boolean(id && founderId && id === founderId.trim());
}
