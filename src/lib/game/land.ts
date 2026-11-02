import { CIVIC_PLOT_IDS } from "./courthouse";
export type RoadPlot = {
  id: string;
  side: "West" | "East";
  x: number;
  z: number;
  width: number;
  depth: number;
  area: number;
  status: "planned" | "civic";
};
// First release plan: 12 lots on each side, clear of the road and sidewalks.
export const ROAD_PLOTS: RoadPlot[] = (["West", "East"] as const).flatMap(
  (side) =>
    Array.from({ length: 12 }, (_, index) => ({
      id: `${side === "West" ? "W" : "E"}${String(index + 1).padStart(2, "0")}`,
      side,
      x: side === "West" ? -13 : 13,
      z: -55 + index * 10,
      width: 12,
      depth: 8,
      area: 96,
      status: CIVIC_PLOT_IDS.has(
        `${side === "West" ? "W" : "E"}${String(index + 1).padStart(2, "0")}`,
      )
        ? ("civic" as const)
        : ("planned" as const),
    })),
);

export function combinePlots(ids: string[]) {
  if (ids.length < 2)
    throw new Error("Choose at least two adjoining home plots.");
  if (new Set(ids).size !== ids.length)
    throw new Error("Choose each plot once.");
  const plots = ids
    .map((id) => {
      const plot = ROAD_PLOTS.find((p) => p.id === id);
      if (!plot || plot.status !== "planned")
        throw new Error("Civic land cannot be combined with home plots.");
      return plot;
    })
    .sort((a, b) => a.z - b.z);
  if (plots.some((p) => p.side !== plots[0].side))
    throw new Error("Plots must be on the same side of the road.");
  if (plots.some((p, i) => i > 0 && p.z - plots[i - 1].z !== 10))
    throw new Error("Plots must touch in sequence, with no missing plots.");
  const width = plots[0].width,
    depth = plots.at(-1)!.z - plots[0].z + plots[0].depth;
  const area = plots.reduce((sum, p) => sum + p.area, 0);
  return {
    ids: plots.map((p) => p.id),
    side: plots[0].side,
    x: plots[0].x,
    z: (plots[0].z + plots.at(-1)!.z) / 2,
    width,
    depth,
    area,
    gapArea: width * depth - area,
  };
}
export type CombinedParcel = ReturnType<typeof combinePlots>;
