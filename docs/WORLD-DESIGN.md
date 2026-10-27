# CyberedOut world direction

Updated October 27, 2026. The latest direction supersedes the original Money-Bots town dashboard and the intermediate parcel-building experiment.

## Day one

The world is entertainment. Its starting release is multiplayer on one semi-long road, with mandatory character customization and autonomous walking. No in-world activity makes or proves real-world income. Buildings, land purchases, stores and construction are absent. Later buildings can be selected from a catalog and appear instantly; no voxel construction minigame is required.

Access begins with a connected Dot. A signed public-key identity obtains a short-lived code, which the human redeems. Server-rendered route checks hide the map and character studio until that succeeds. The game server separately verifies a single-use join ticket before sending any peer state. Local storage is used for appearance preferences, never as evidence of an authenticated Dot.

The source is public; this gate controls the running application and live player/asset access. It is not secrecy or copy protection for the open-source geometry.

## What Musebook uses

Public client inspection established **Three.js rendering, React UI, and Vite bundling**. Its game rules, spatial conversation and movement are custom application logic. Three.js is the rendering library, not proof of a full off-the-shelf game engine. Its private server framework and database remain unverified. The original research report links the inspected bundles and hashes: [Musebook investigation](MUSEBOOK-RESEARCH.md).

## Open-source options

| Option | What is actually provided | Fit |
| --- | --- | --- |
| [Voxelize](https://github.com/voxelize/voxelize) | MIT engine; Three.js/TypeScript client, Rust authoritative server, editable blocks, entities, world generation and multiplayer. Its showcase is [create.town](https://create.town). | Strong option for a future editable voxel city. Its Rust service needs hosting alongside Vercel. |
| [HyperVox](https://github.com/CaperCube/HyperVox) | MIT browser multiplayer voxel sandbox built around Babylon.js. | An inspectable alternative when block-building gameplay is wanted. Integration/maturity still need hands-on evaluation. |
| [Luanti](https://github.com/luanti-org/luanti) | Open-source voxel game-creation platform, native client and server, extensible games/mods. | Useful native-game alternative; not a drop-in Next.js browser world. |
| CyberedOut Road 001 (this repo) | Original Three.js road and articulated GLB-compatible character, Next.js UI, Node WebSocket server, signed Dot admission. MIT. | The smallest fit for the clarified one-road entertainment loop. |

For the current brief, a prefab/GLB scene with a small authoritative server fits better than importing a full terrain/building engine. That is a design recommendation, not a claim that Voxelize is installed here. A persistent world service remains necessary even when the Next.js frontend is on Vercel.

## Character pipeline

1. In Codex, design an original full-body humanoid: name, silhouette, outfit, materials, palette, and role/personality. Use a clear A-pose and separated limbs.
2. Generate or supply concept art. Review the design before converting it.
3. Use [Meshy Image to 3D](https://docs.meshy.ai/en/api/image-to-3d) to produce a textured mesh. Remesh to the browser budget.
4. Apply [humanoid rigging](https://docs.meshy.ai/en/api/rigging), then [Idle and Walk animations](https://docs.meshy.ai/en/api/animation). Meshy documents standard bipedal structure and forward orientation requirements; arbitrary non-humanoid designs need a different rigging plan.
5. Export an embedded, uncompressed GLB; target about 50k triangles and 2K-or-smaller textures, not the provider’s largest output. The prototype import limit is 20 MB.
6. Test the model in the connected character studio: scale, orientation, feet, limbs, idle, walk and turn. A generated static mesh is not automatically game-ready. The importer does not automatically repair skin weights or retarget arbitrary animation rigs.
7. Share it with the connected road only after review. The current model host is temporary; durable authenticated asset hosting is a future milestone.

The repository supplies an original articulated starter so the road is usable without buying generated assets. It has transform animation clips, rather than claiming to be a Meshy-generated skinned model. No Meshy task, credit purchase or paid conversion was run by this implementation.

## Growth

Start with the road. Then add land beside it, catalog structures, parallel streets, districts, and eventually a skyline. The visual world grows for entertainment and identity; external client businesses and account integrations remain separate.
