// Original Theatre.js arrival camera timeline; no Studio editor in the production bundle.
const frame = (id: string, position: number, value: number) => ({
  id,
  position,
  value,
  connectedRight: true,
  handles: [0.5, 0, 0.5, 1],
  type: "bezier" as const,
});
export const cameraState = {
  definitionVersion: "0.4.0",
  revisionHistory: [],
  sheetsById: {
    Town: {
      staticOverrides: { byObject: {} },
      sequence: {
        type: "PositionalSequence" as const,
        length: 3,
        subUnitsPerUnit: 30,
        tracksByObject: {
          Camera: {
            trackIdByPropPath: { '["zoom"]': "zoom" },
            trackData: {
              zoom: {
                type: "BasicKeyframedTrack" as const,
                keyframes: [frame("wide", 0, 0.77), frame("arrive", 2.5, 1)],
              },
            },
          },
        },
      },
    },
  },
};
