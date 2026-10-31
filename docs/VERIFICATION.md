# CyberedOut verification

## October 31, 2026 — one-image character pipeline

- The server integration implements Meshy Image-to-3D, rigging and merged animation export; completed owner-only models and jobs are stored on persistent disk. The studio has a one-image upload and explicit consent; the Dot CLI supports signed image submission/status; generated models automatically install in the studio and share on road connection.
- Fifteen automated tests pass, including six new provider-fixture tests for pipeline sequencing, stable idempotency, owner-only artifacts, interrupted paid requests/restart recovery, input validation, missing rigs and unsafe/oversized provider downloads. These fixtures are not real generated characters.
- Optimized Next.js build and the local HTTP/multiplayer checks pass, including browser/signed-Dot character authentication, signature tampering/replay rejection, anonymous asset blocking, protected studio, and existing two-player walking.
- Local browser inspection confirms the new one-image screen is behind the connected-Dot gate and generation is disabled without operator configuration.
- No Meshy API key, paid conversion or actual Meshy character was used. Live output, skinning/animation quality and a deployed public world host still require verification. This revision does not assert public signup has been restored.

## October 27, 2026 — gated road

The current scope is a connected-Dot-gated, road-only multiplayer entertainment world. Earlier town/parcel mockups have been removed from the running world.

Verified:

- TypeScript check, Next.js optimized build, and nine automated tests covering retained work-console protections plus bounded character/peer data, articulated starter animations and safe GLB metadata handling.
- Authenticated multiplayer integration: signed identity creation, stable identity retry, signature tamper rejection, nonce replay rejection, code rotation, one-use code rejection, HttpOnly session creation, protected road/studio routes, one-use world tickets, two actual peers seeing each other, automatic walking, appearance propagation, pause, departure and denied origins.
- Browser flow on localhost: before connection, only the branded black connection screen is visible; a local signed QA Dot's code opens the character studio; customization and original animated GLB export succeed; confirming customization joins the road; the server reports the actual connected Dot; Disconnect returns to the gate and hides map/character again.
- The supplied header logo is copied byte-for-byte. Diagonal up-right arrow icons were removed from authored interface text.
- The original road and character are authored source, not copied Musebook assets. No provider-generation credits were used.

The final gate screenshot is `docs/connect-gate.png`. No current map/character screenshot is published in the README; the running application reveals them only after linking.

Not claimed: hosted deployment, cross-network/mobile-device certification, a production-hardened identity/session/asset service, Meshy-generated character output, automatic rig repair, a Supabase/provider live integration, buildings, purchases, or any actual earnings. Production readiness requires the setup and operational work in SETUP.md.
