import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page empty-state">
      <span className="empty-symbol"></span>
      <h1>This street isn’t built yet.</h1>
      <p>Head back to the town square.</p>
      <Link href="/">Back to CyberedOut</Link>
    </div>
  );
}
