"use client";
import Link from "next/link";
export function ConnectionUnavailable() {
  return (
    <div className="page">
      <section className="paper founding-intro" role="status">
        <h1>Your browser still has its connection.</h1>
        <p>
          The world service could not verify it just now. This does not mean you
          have signed out. Keep your existing connection; you do not need a new
          code for a temporary service problem.
        </p>
        <div className="land-actions">
          <button onClick={() => window.location.reload()}>
            Retry connection
          </button>
          <Link href="/world">Watch the public world</Link>
        </div>
      </section>
    </div>
  );
}
