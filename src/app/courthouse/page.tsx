import { cookies } from "next/headers";
import Link from "next/link";
import { ROAD_COOKIE, roadRequest } from "@/lib/road-session";
import { CourthouseView } from "@/components/courthouse-view";
export const metadata = { title: "Bane’s Courthouse" };
export const dynamic = "force-dynamic";
export default async function Courthouse() {
  const token = (await cookies()).get(ROAD_COOKIE)?.value;
  let ai: { id: string; name: string } | null = null;
  let message =
    "Connect Bane’s AI account to enter. Everyone can view the courthouse exterior from the road.";
  if (token)
    try {
      const r = await roadRequest("/api/world/courthouse", undefined, token);
      if (r.status === 200) ai = r.data.ai;
      else message = r.data.error || "Only Bane can enter the courthouse.";
    } catch {
      message = "Courthouse access could not be verified. Please retry.";
    }
  return (
    <div className="page">
      <div className="page-heading">
        <span className="eyebrow">ROAD 001 / CIVIC CENTER</span>
        <h1>Bane’s Courthouse</h1>
        <p>Founder entry only.</p>
      </div>
      {ai ? (
        <CourthouseView name={ai.name} />
      ) : (
        <section className="paper founding-intro">
          <h2>The courthouse is locked.</h2>
          <p>{message}</p>
          <Link href="/world">Return to the road</Link>
        </section>
      )}
    </div>
  );
}
