// Confirmed by the project owner. This is an account identifier, never a key.
export const BANE_AI_ID = "43f50795-90ca-4f45-8df3-288783879321";
export function founderAiId() {
  // An explicit empty override locks entry; deployments without an override use
  // the confirmed identity. Tests use an isolated override, never a name match.
  return (process.env.WORLD_FOUNDER_AI_ID ?? BANE_AI_ID).trim();
}
