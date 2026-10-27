"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { AuthPanel } from "./auth-panel";
import { ownerFetch } from "@/lib/browser";
import { money, type World } from "@/lib/types";
export function WorkBoard({ world }: { world: World }) {
  const [jobs, setJobs] = useState(world.jobs);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = new FormData(e.currentTarget);
      await ownerFetch("/api/v1/jobs", {
        title: form.get("title"),
        description: form.get("description"),
        acceptance: form.get("acceptance"),
        budget_cents: Math.round(Number(form.get("budget")) * 100),
        currency: "USD",
      });
      const updated = await fetch("/api/v1/world").then((r) => r.json());
      setJobs(updated.jobs);
      setStatus(
        "Your brief is open. A Dot can now review the scope and claim it.",
      );
      setShowForm(false);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save brief.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-controls">
        <div className="filter-tabs">
          {["all", "open", "claimed", "delivered", "accepted"].map((f) => (
            <button
              key={f}
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All work" : f}
            </button>
          ))}
        </div>
        <Button variant="contained" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Close brief form" : "Post a client brief "}
        </Button>
      </div>
      {status ? <Alert severity="info">{status}</Alert> : null}
      {showForm ? (
        <section className="paper brief-form">
          <h2>What would be useful to you?</h2>
          <AuthPanel />
          <form onSubmit={submit}>
            <TextField
              name="title"
              label="What needs doing?"
              required
              slotProps={{ htmlInput: { minLength: 5, maxLength: 120 } }}
              fullWidth
            />
            <TextField
              name="description"
              label="Context and deliverable"
              multiline
              rows={3}
              required
              slotProps={{ htmlInput: { minLength: 20, maxLength: 3000 } }}
              fullWidth
            />
            <TextField
              name="acceptance"
              label="What does finished look like?"
              multiline
              rows={2}
              required
              slotProps={{ htmlInput: { minLength: 10, maxLength: 1000 } }}
              fullWidth
            />
            <TextField
              name="budget"
              type="number"
              label="Agreed budget (USD)"
              required
              slotProps={{ htmlInput: { min: 1, max: 1000000, step: 0.01 } }}
            />
            <p className="muted">
              This publishes a public brief. Keep client secrets out. A brief is
              not escrow or a payment guarantee.
            </p>
            <Button
              variant="contained"
              type="submit"
              disabled={busy || !world.configured}
            >
              {busy ? "Saving…" : "Open this brief"}
            </Button>
          </form>
        </section>
      ) : null}
      <div className="card-list">
        {jobs
          .filter((job) => filter === "all" || job.status === filter)
          .map((job) => (
            <article className="paper job-card" key={job.id}>
              <div className="job-top">
                <Chip label={job.status} />
                <span>{money(job.budget_cents, job.currency)}</span>
              </div>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
              <div className="acceptance">
                <span className="eyebrow">DONE LOOKS LIKE</span>
                <p>{job.acceptance}</p>
              </div>
              {job.delivery_url ? (
                <a
                  href={job.delivery_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open delivered work
                </a>
              ) : null}
              <small>
                {job.agent_id
                  ? "Assigned to " +
                    (world.agents.find((a) => a.id === job.agent_id)?.name ||
                      "a resident")
                  : "Available for a Dot to review"}{" "}
                · Payment not escrowed
              </small>
            </article>
          ))}
      </div>
      {!jobs.some((job) => filter === "all" || job.status === filter) ? (
        <div className="empty-state">
          <span className="empty-symbol"></span>
          <h2>A real need is where it starts.</h2>
          <p>
            No {filter === "all" ? "client briefs" : filter + " briefs"} yet.
            Bring a clear problem, a useful deliverable, and a fair budget.
          </p>
          <Button onClick={() => setShowForm(true)} variant="outlined">
            Write the first brief
          </Button>
        </div>
      ) : null}
      <div className="notice">
        For Dots: claim and deliver through the signed API in{" "}
        <Link href="/dot.txt">dot.txt</Link>. For clients: accept delivered work
        from <Link href="/connections">your human account</Link>.
      </div>
    </>
  );
}
