# CyberedOut verification

## October 31, 2026 — remembered browsers

- Dot browser sessions and cookies now last 30 days. Only token hashes, Dot IDs and expiration timestamps are saved atomically with mode 0600 next to the persistent world identity file. Connect succeeds only after its session is saved; Disconnect Dot removes the saved session before the web cookie is cleared.
- Eighteen automated tests and the optimized build pass. Session-store tests cover token hashing, file permissions, expiry, reload and durable logout. `npm run test:sessions` additionally registers a disposable QA Dot, links a session, restarts the real world process, verifies the same Dot can obtain a ticket with its existing session, signs out, restarts again and confirms that session stays invalid.
- Local HTTP/multiplayer checks pass, including the exact 30-day cookie lifetime and existing player/spectator separation. Old sessions created before persistence cannot be migrated from the previous process's memory and need one final connection code. Browser sign-out, cleared cookies, a different browser/domain or 30-day expiry require linking again; deployments do not.

## October 31, 2026 — public spectator entry

- ENTER WORLD is visible in the header with or without a connected Dot and opens the public `/world` page. Character customization and joining as a player remain session protected. This intentionally supersedes the earlier requirement to hide the entire map from anonymous visitors.
- Build, sixteen automated tests and HTTP/multiplayer smoke checks pass. Integration verifies public spectators receive live snapshots/shared models, do not increase the player count, cannot upload or control players, and lose model-reading access when disconnected.
- Browser verification: an anonymous visitor entered through the header, saw an empty road with no invented avatar, then saw a separate local QA player and its real Meshy character. There were no browser runtime errors during this check. QA activity and screenshots are local verification, not production traffic.

## October 31, 2026 — manual Meshy GLB import

- Raised the shared browser, multiplayer-upload and provider-download GLB cap to 80 MB. Sixteen automated tests pass, including the exact size boundary; a 24 MB fixture uploads through the authenticated road server and is downloadable by another admitted player.
- Manually loaded the user's existing 57,276,640-byte Meshy GLB in an authenticated local browser: embedded textures, one skeleton and six animation clips load; the character is visibly textured and walking. This test did not call Meshy or spend credits, and the private model is not included in Git.
- Import now shows reading/saving/loading progress, success and errors beside the picker and preview. A completed manual import scrolls and focuses the preview. Re-selecting the same file triggers a fresh load. Invalid input shows an inline error, and choosing the valid Meshy file again recovers successfully. The optimized build passes; browser runtime errors were empty during these checks.

## October 31, 2026 — one-image character pipeline

- The server integration implements Meshy Image-to-3D, rigging and merged animation export; completed owner-only models and jobs are stored on persistent disk. The studio has a one-image upload and explicit consent; the Dot CLI supports signed image submission/status; generated models automatically install in the studio and share on road connection.
- Fifteen automated tests pass, including six new provider-fixture tests for pipeline sequencing, stable idempotency, owner-only artifacts, interrupted paid requests/restart recovery, input validation, missing rigs and unsafe/oversized provider downloads. These fixtures are not real generated characters.
- Optimized Next.js build and the local HTTP/multiplayer checks pass, including browser/signed-Dot character authentication, signature tampering/replay rejection, anonymous asset blocking, protected studio, and existing two-player walking.
- Local browser inspection confirms the new one-image screen is behind the connected-Dot gate and generation is disabled without operator configuration.
- No Meshy API key or paid conversion was used. The automatic provider roundtrip still requires a funded live test; later manual Meshy-file verification is recorded above. This section describes the original integration checks, not the later hosting rollout.

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
