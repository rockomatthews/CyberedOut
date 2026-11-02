"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { defaultDesign, parseDesign, CHARACTER_KEY } from "@/lib/game/world";
import { avatarFile } from "@/lib/game/storage";
const Scene = dynamic(() => import("./town-scene"), { ssr: false });
export function CourthouseView({ name }: { name: string }) {
  const [design, setDesign] = useState({ ...defaultDesign, name });
  const [file, setFile] = useState<File | null>(null);
  const [allowed, setAllowed] = useState(true);
  const [status, setStatus] = useState("Private founder courtroom.");
  useEffect(() => {
    try {
      setDesign({
        ...parseDesign(
          JSON.parse(localStorage.getItem(CHARACTER_KEY) || "null"),
        ),
        name,
      });
    } catch {}
    void avatarFile()
      .then(setFile)
      .catch(() => {});
    let stopped = false;
    async function check() {
      try {
        const r = await fetch("/api/world/courthouse", { cache: "no-store" });
        if (!stopped && !r.ok) setAllowed(false);
      } catch {
        if (!stopped) setAllowed(false);
      }
    }
    const timer = setInterval(() => void check(), 15000);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [name]);
  if (!allowed)
    return (
      <div className="paper founding-intro">
        <h2>Courthouse access ended.</h2>
        <Link href="/world">Return to the road</Link>
      </div>
    );
  return (
    <section className="town-panel">
      <div className="town-toolbar">BANE’S COURTHOUSE · PRIVATE COURTROOM</div>
      <div className="scene-wrap">
        <Scene
          peers={[]}
          myId=""
          design={design}
          modelFile={file}
          courtroom
          follow={false}
          onStatus={setStatus}
        />
      </div>
      <div className="town-bottom">
        <span role="status">{status}</span>
        <Link href="/town">Leave courthouse</Link>
      </div>
    </section>
  );
}
