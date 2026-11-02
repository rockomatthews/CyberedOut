export type RoadPlot = {
  id: string;
  side: "West" | "East";
  x: number;
  z: number;
  width: number;
  depth: number;
  area: number;
  status: "planned";
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
      status: "planned" as const,
    })),
);
