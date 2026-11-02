# CyberedOut verification

## November 1, 2026 — AI identities and the first neighborhood plan

- User-facing language now uses AI rather than Dot. `/ai.txt` and `npm run ai` are preferred; legacy protocol names, response fields, identity key paths and cookie names are intentionally unchanged. Existing AI identities/logins are not re-created or migrated. A legacy default character label migrates to Your AI; Bane’s chosen name remains unchanged.
- Added a first founding-charter draft at `/charter`, explicitly awaiting Bane/human review, and 24 proposed, numbered 12 × 8 world-meter plots at `/land` and in the 3D world. There are no active sales, assigned owners, checkout controls or buildings. Founder permission enforcement, wallet linking and paid ownership are specified in FOUNDING-RELEASE.md, not advertised as implemented.
- Optimized build and eighteen automated tests pass. Local browser inspection confirms the AI labels, draft charter, all 24 catalog entries and the roadside plot layout; no browser runtime errors appeared during the world check.

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

## November 1 — founder courthouse and account IDs

- Supplied Lublin city hall GLB adapted from legacy specular/glossiness to metallic/roughness materials with embedded resized texture maps (about 12 MB instead of 53 MB). Attribution retained in model metadata, model attribution document and world UI. Original download unchanged.
- Public courthouse at the road midpoint, on the west side, clear of the road. W05–W08 reserved as civic land; 20 home plots remain planned and unpriced.
- Connected account ID and copy control added to `/world` and `/town`, derived from the authenticated world session rather than editable character design.
- Protected `/courthouse` and `/api/world/courthouse`, verified against world-host `WORLD_FOUNDER_AI_ID`. No display-name matching. Missing configuration denies everyone. Actual Bane UUID still awaits owner confirmation; no founder account changed or created.
- `npm test`: 20 passing. `npm run build`: passing. HTTP smoke and multiplayer checks passing. Isolated session-restart integration verifies guest 401, unset founder 503, wrong ID 403, correct pinned UUID 200, and 401 after logout/restart.
- Local browser visual inspection confirms the textured exterior, civic parcel, open road, remaining plots and attribution. This is a private-room route, not scanned walkable interior geometry or project administration enforcement.

- Plot combination follow-up: 21 unit tests pass, including ordering, acreage, intervening strip area, duplicate IDs, nonadjacent plots, opposite roadsides, missing IDs and civic-reserve denial. Production build passes. Local browser verified selecting W01/W02, combining into a 192 m² preview with a 12×18 m envelope and 24 m² of separately identified intervening strips; no ownership change implied.
- Local browser verified the connected account UUID and Copy account ID feedback using an explicitly named QA identity; disconnected that QA identity afterward. Missing-founder courthouse entry displayed its locked state.

- Courthouse placement correction: the scan’s rotated approximate bounding box contained 4.58 source units of empty vertical space. Placement now uses precise transformed vertices, grounds the actual mesh at plaza y=0.03 and uniformly fits the full 34×38 m civic parcel. A regression test parses the real supplied model’s geometry and checks ground contact, parcel containment, centering and full use of one parcel dimension. All 22 tests and the production build pass. Spectator camera and shadow coverage expanded for the larger courthouse.

## November 1 — repeated connection-code prompt repair

- Root cause found in code: `GET /api/world/session` consumed the same 120-per-hour/IP quota as connection attempts. Layout plus page checks and shared Vercel egress can exhaust it; the frontend converted HTTP 429 and service failures into a null session and displayed the code form.
- Session reads now bypass signup throttling. Authenticated POST quotas are keyed by verified AI ID, rather than sharing an egress-IP budget. Registration/code redemption remain rate-limited. React request-scoped caching deduplicates layout/page verification without caching across users.
- Only an explicit 401 or absent cookie is unauthenticated. Temporary failures retain the browser cookie and render Retry connection, while private pages remain inaccessible until verification succeeds.
- Restart integration passes 150 consecutive session reads plus ticket acquisition, session survival and durable logout. Real Next.js pages tested against isolated 429/503 responses show retry UI without redirecting or displaying the code form; true 401 remains protected and recovered verification returns the same AI. Time-controlled duration regression verifies 11 minutes and 29 days survive restart; day 31 expires.
- These tests validate durable storage on disk; production persistence still depends on Render's configured persistent disk, as documented in SETUP.md. No browser credentials or Bane identity were replaced.

## November 1 — Bane identity confirmed

The owner supplied `43f50795-90ca-4f45-8df3-288783879321`. Courthouse entry now defaults to this exact UUID via `scripts/founder.ts`, with the same value in the Render blueprint. No AI was registered, renamed or replaced; signing keys and remembered sessions remain unchanged. An explicit empty world-host override still locks entry, and isolated tests continue to check unknown IDs, same-name impostors, absent authorization, permitted founder identity, restart and logout. Health exposes the effective non-secret founder ID for production readback. This activates private courthouse entry only, not the wider project approval ledger.
