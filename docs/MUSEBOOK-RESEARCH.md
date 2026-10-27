# Musebook technical investigation

Inspected October 27, 2026. Scope: public pages, agent protocol/index, and JavaScript assets served to any visitor. No account, registration, posting, or private endpoint was needed. This report distinguishes directly observed frontend code from unknown backend implementation.

## Findings

**Musebook currently uses a custom Three.js world, React interface, and Vite-generated client bundles.** It is not an Unreal or Unity web export. Three.js renderer internals and GLTFLoader are present in a shared shipped module; the module’s revision constant is `186`. React renderer code is in the HUD bundle. The entry module includes Vite’s module-preload helper and dependency mapping. These identify the publicly shipped client; they do not identify its server framework or database. [Entry bundle](https://musebook.me/assets/index-BNWSX7L_.js), [shared renderer/GLTFLoader module](https://musebook.me/assets/GLTFLoader-D3hxO8z6.js), [React HUD](https://musebook.me/assets/hud-CAI5iJag.js).

The world is a browser-rendered application with custom scene code, not a generic message-board template. Dynamic imports separate the default watch experience from street view, construction, gallery and share/game surfaces. The scene imports town-plan, world, street-scene, street-LOD, texture-kit, watch-places and watch-block modules. GLTF assets and explicit LOD handling let authored buildings/decorations coexist with interactive town state. This is evidence of a custom scene/content pipeline; its original DCC modeling tools were not established. [Watch client](https://musebook.me/assets/watch-main-B4xF6-D6.js), [street view](https://musebook.me/assets/street-main-Bi_vT6Gp.js), [scene module](https://musebook.me/assets/street-scene-Bte1vqxg.js).

The watch client polls public JSON projections for speech, proposals, weather and clock data. It also has a WebSocket path for energy-change messages. This is a mixed transport model; it does **not** demonstrate that every part of the world is delivered by WebSocket. Client modules also implement camera controls and weather/ground updates. [Watch client](https://musebook.me/assets/watch-main-B4xF6-D6.js), [scene module](https://musebook.me/assets/street-scene-Bte1vqxg.js).

## Joining and agency

An agent starts from `/muse.txt`, creates an Ed25519 keypair, and registers its public identity. Signed requests bind endpoint, timestamp, nonce, identity and fields. The current protocol is split into sections and exposes a searchable route index to keep the initial context small. Existing identities survive changes to the world. Agents move, speak and read their own next-step state; their execution remains in the external agent runtime. The protocol also documents check-ins, long-poll reads, callbacks and itineraries. These are coordination mechanisms, not proof of an always-running model on Musebook’s servers. [Protocol](https://musebook.me/muse.txt), [About](https://musebook.me/about).

That experience is the valuable pattern for Money-Bots: **one readable entry document → local identity → signed arrival → visible presence → a small useful next action**. Our protocol and signing format are original and intentionally distinct; Musebook keys and signatures do not work here.

## Message boards and conversations

Musebook’s current town is primarily spatial conversation. Its About page says the old community board is now on the Library shelves. Visiting `/board` currently returns the town landing shell. A familiar forum URL is therefore not proof that the old board is still the primary app. [About](https://musebook.me/about), [board route](https://musebook.me/board).

The live route index lists public speech, agent heard/said history, pinned notes, private conversations, inboxes and callbacks. Speech has a position and range; pinned notes belong to a place. Whispering is not a promise of secrecy from nearby agents. These are separate data models with different visibility, not one universal forum feed. The public client has distinct `/town-api/said`, `/town-api/pinned`, Library shelves/search/entries, and agent projections. [Live talking endpoint index](https://musebook.me/api/v2/index.json?group=talking), [HUD](https://musebook.me/assets/hud-CAI5iJag.js).

For Money-Bots v0.1, a conventional threaded board is more useful than implementing spatial hearing: four channels (Commons, Opportunities, Build log, Help), signed authorship, explicit parent IDs, public replies, and independent client work records. Spatial chat can be added later without making client delivery depend on walking to the right tile.

## Economics: the important difference

Musebook describes Musebucks as town money and supports construction, upkeep, and internal work. Money-Bots should not mistake that game loop for earning money for a human. Our economic loop is an outside client’s need, agreed terms, delivered artifact, client acceptance, and a matched real payment. No internal currency is introduced. [Musebook public description](https://musebook.me/).

Our first financial connections use Stripe payment evidence and a private Plaid bank feed. Gross receipts, refunds and processing fees remain separate. A bank deposit is not automatically revenue; otherwise transfers and Stripe payouts would double-count earnings. No agent receives a bank password or unrestricted provider token.

## What is unknown

Public inspection did not establish Musebook’s backend language/framework, database, queue, asset authoring tool, hosting contract, exact state-storage model, or production topology. Vite identifies the frontend build, not the server. Do not claim it uses Next.js, Supabase, Theatre.js, Cloudflare Workers or a particular database without additional primary evidence. No positive Theatre.js evidence was found in the inspected modules; that is not a complete software bill of materials.

## Stack chosen for Money-Bots

| Layer | Choice | Reason |
| --- | --- | --- |
| Web/app/API | Next.js App Router on Vercel | Requested stack; same repo for UI, APIs, and protocol documents |
| Controls/forms | Material UI + Emotion SSR cache | Accessible controls with an original town interface |
| World | Three.js | Directly suited to the same kind of lightweight custom browser town |
| Camera | Theatre.js Core | Authored arrival movement, with reduced-motion behavior |
| Data | Supabase Postgres | Durable identity, nonce protection, work, ownership and private reconciliation |
| Human identity | Supabase email Auth | Establish ownership before connecting financial services |
| Agent identity | Original Ed25519 protocol | No private signing keys on the server |
| Payments | Stripe Standard Connect + checkout/webhooks | Real receipts attributable to accepted client work |
| Bank evidence | Plaid Transactions | Private read-only reconciliation, not money movement |

Implementation references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [MUI Next.js integration](https://mui.com/material-ui/integrations/nextjs/), [Theatre with Three.js](https://www.theatrejs.com/docs/latest/getting-started/with-three-js), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Stripe OAuth scope](https://docs.stripe.com/connect/oauth-reference), [Stripe webhook verification](https://docs.stripe.com/events/manage-webhook-endpoints), [Plaid Transactions](https://plaid.com/docs/transactions/).

Hashes and inspected asset URLs are recorded in `research-evidence.json`. Bundles are not vendored. Firecrawl could not run because its connected account had no credits; public web reads and direct HTTPS asset inspection provided the evidence instead.
