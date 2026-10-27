import Link from "next/link";
export const metadata = { title: "About the world" };
export default function Guide() {
  return (
    <div className="page field-guide">
      <div className="page-heading">
        <span className="eyebrow">CYBEREDOUT / THE WORLD</span>
        <h1>
          Start with a road.
          <br />
          Leave room for a city.
        </h1>
        <p>
          An independent, open-source multiplayer world. The world is
          entertainment. A Dot’s actual business work happens outside it.
        </p>
      </div>
      <div className="guide-layout">
        <aside>
          <a href="#start">01 / Day one</a>
          <a href="#characters">02 / Characters</a>
          <a href="#multiplayer">03 / Multiplayer</a>
          <a href="#future">04 / The skyline</a>
          <a href="#source">05 / Open source</a>
        </aside>
        <article className="paper">
          <section id="start">
            <span className="eyebrow">01 / DAY ONE</span>
            <h2>One semi-long road. That’s it.</h2>
            <p>
              Road 001 is 120 meters of road, with space for characters to walk
              beside each other. No lots to purchase, buildings to manage, or
              game economy. A character’s position has no effect on real-world
              earnings.
            </p>
            <p>
              Walking is automatic. You can pause your Dot, follow it with the
              camera, or orbit the world. Other visible players are actual
              connected sessions; the app does not invent a crowd.
            </p>
          </section>
          <section id="characters">
            <span className="eyebrow">02 / CHARACTERS</span>
            <h2>Make your body your own.</h2>
            <p>
              Customize the original articulated starter’s name, colors, role
              and proportions. Export a playable GLB with Idle and Walk clips,
              or design concept art in Codex and turn it into a textured
              humanoid through Meshy.
            </p>
            <p>
              The character pipeline is concept → 3D mesh → rig → idle/walk
              animations → optimized GLB → movement test. A static generated
              mesh is not automatically an animated character. The studio lets
              you inspect the result before using it.
            </p>
            <Link href="/characters">Open the character studio</Link>
          </section>
          <section id="multiplayer">
            <span className="eyebrow">03 / MULTIPLAYER</span>
            <h2>One server. The same road.</h2>
            <p>
              The included open-source WebSocket server maintains player
              sessions, movement and appearance. Each connected player receives
              the same road state. Custom GLBs can be shared explicitly with the
              current session; temporary models are removed when their uploader
              disconnects.
            </p>
            <p>
              Vercel serves the Next.js site. The persistent multiplayer server
              needs a WebSocket-capable host alongside it. Local development
              uses port 3020. If the server is unavailable, the world says
              offline and displays only your local character preview.
            </p>
          </section>
          <section id="future">
            <span className="eyebrow">04 / THE SKYLINE</span>
            <h2>Grow it like Dubai.</h2>
            <p>
              The starting release stays a road. Later, land parcels can flank
              it, with catalog structures that appear when selected and placed.
              No block-by-block construction is required. More roads, homes,
              storefronts and districts can follow actual demand.
            </p>
            <p>
              Those features are a roadmap, not present purchases or buildings.
              The external work console remains available as a separate project
              surface; walking around this world does not claim to make anyone
              money.
            </p>
            <Link href="/work">Open the separate work console</Link>
          </section>
          <section id="source">
            <span className="eyebrow">05 / OPEN SOURCE</span>
            <h2>The whole starting world is open.</h2>
            <p>
              The Next.js client, Three.js renderer, original starter character,
              road geometry, animation clips and multiplayer server are included
              under the MIT license. Your supplied CyberedOut logo remains your
              brand asset. Independently uploaded character assets retain their
              own rights.
            </p>
            <a
              href="https://github.com/rockomatthews/CyberedOut"
              target="_blank"
              rel="noreferrer"
            >
              Read and build on the source
            </a>
          </section>
        </article>
      </div>
    </div>
  );
}
