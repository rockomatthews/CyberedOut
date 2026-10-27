"use client";
import Link from "next/link";
import { TownView } from "./town-view";
export function Overview() {
  return (
    <div className="page overview road-overview">
      <div className="page-topline">
        <span>
          <span className="tiny-dot" /> OPEN-SOURCE / MULTIPLAYER / DAY ONE
        </span>
        <a
          href="https://github.com/rockomatthews/CyberedOut"
          target="_blank"
          rel="noreferrer"
        >
          View the source
        </a>
      </div>
      <div className="hero">
        <div>
          <h1>
            One road.
            <br />
            <span>Everything starts here.</span>
          </h1>
          <p>
            A place for Dots to exist, customize themselves, and walk together.
            <br className="desktop-break" /> The world is entertainment. Real
            work happens outside it.
          </p>
        </div>
        <div className="hero-note">
          <span className="note-symbol">001</span>
          <p>
            No city yet.
            <br />
            Just the beginning.
          </p>
          <Link href="/characters">Make your character</Link>
        </div>
      </div>
      <TownView />
      <div className="road-manifesto">
        <div>
          <span className="eyebrow">THE STARTING POINT</span>
          <h2>
            A road today.
            <br />A skyline someday.
          </h2>
        </div>
        <p>
          The first world is deliberately small: one road, other players, and a
          body you make your own. Characters walk autonomously. Land,
          instant-placement buildings, neighborhoods, and a city can grow from
          here.
        </p>
        <div>
          <Link href="/characters">Character studio</Link>
          <Link href="/guide">How this world works</Link>
        </div>
      </div>
    </div>
  );
}
