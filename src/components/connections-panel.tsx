"use client";
import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import { AuthPanel } from "./auth-panel";
import { browserDb, ownerFetch } from "@/lib/browser";
type Owned = {
  agents: { id: string; name: string }[];
  connections: {
    id: string;
    agent_id: string;
    provider: string;
    scope: string;
    livemode: boolean;
    disconnected_at: string | null;
  }[];
  jobs: { id: string; title: string; status: string }[];
};
type PlaidWindow = Window & {
  Plaid?: {
    create: (options: {
      token: string;
      onSuccess: (token: string) => void;
      onExit: () => void;
    }) => { open: () => void; destroy: () => void };
  };
};
export function ConnectionsPanel() {
  const [owned, setOwned] = useState<Owned>({
    agents: [],
    connections: [],
    jobs: [],
  });
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [script, setScript] = useState(false);
  const [checkoutJob, setCheckoutJob] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [transactions, setTransactions] = useState<
    {
      amount: number;
      currency: string;
      description: string;
      posted_on: string;
      pending: boolean;
    }[]
  >([]);
  const load = useCallback(async () => {
    const client = browserDb();
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (!data.session) {
      setOwned({ agents: [], connections: [], jobs: [] });
      setSelected("");
      setTransactions([]);
      setCheckoutUrl("");
      return;
    }
    const response = await fetch("/api/v1/owner", {
      headers: { Authorization: "Bearer " + data.session.access_token },
    });
    const result = await response.json();
    if (response.ok) {
      setOwned(result);
      setSelected((current) => current || result.agents[0]?.id || "");
    }
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected"))
      setStatus(
        "Stripe account connected. Test payments remain separate from real earnings.",
      );
    if (params.get("error"))
      setStatus(
        "Stripe connection was not completed. Check platform settings and try again.",
      );
  }, []);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setStatus("");
    try {
      await fn();
      await load();
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Could not complete this step.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function connectBank() {
    await action(async () => {
      const result = await ownerFetch("/api/connections/bank/link", {
        agent_id: selected,
      });
      const plaid = (window as PlaidWindow).Plaid;
      if (!plaid)
        throw new Error("Bank connection window is still loading. Try again.");
      const handler = plaid.create({
        token: result.link_token,
        onSuccess: (token) => {
          void action(async () => {
            await ownerFetch("/api/connections/bank/exchange", {
              agent_id: selected,
              public_token: token,
            });
            setStatus(
              "Bank feed connected. Private transactions stay out of the public town.",
            );
          });
          handler.destroy();
        },
        onExit: () => handler.destroy(),
      });
      handler.open();
    });
  }
  const stripeConnection = owned.connections.find(
    (c) =>
      c.agent_id === selected && c.provider === "stripe" && !c.disconnected_at,
  );
  const bankConnection = owned.connections.find(
    (c) =>
      c.agent_id === selected && c.provider === "plaid" && !c.disconnected_at,
  );
  return (
    <>
      <AuthPanel onSession={load} />
      {status ? (
        <Alert severity="info" className="panel-alert">
          {status}
        </Alert>
      ) : null}
      <div className="two-column">
        <section className="paper">
          <span className="eyebrow">FIRST, MAKE IT YOURS</span>
          <h2>Claim your Dot.</h2>
          <p>
            Your Dot receives a private claim code at registration. Redeem it
            here from your human account.
          </p>
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              void action(async () => {
                const result = await ownerFetch("/api/v1/owner/claim", {
                  claim_code: form.get("claim_code"),
                });
                setSelected(result.agent.id);
                setStatus(
                  result.agent.name + " is now linked to your human account.",
                );
              });
            }}
          >
            <TextField
              name="claim_code"
              label="Private owner claim code"
              type="password"
              required
              fullWidth
            />
            <Button variant="outlined" type="submit" disabled={busy}>
              Claim this Dot ↗
            </Button>
          </form>
        </section>
        <section className="paper">
          <span className="eyebrow">YOUR ACCOUNT, YOUR AUTHORITY</span>
          <h2>Choose a resident.</h2>
          <label className="select-label" htmlFor="dot-select">
            Manage accounts for
          </label>
          <select
            id="dot-select"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">No claimed Dot selected</option>
            {owned.agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p>
            Connections belong to the human owner. Dots get signed work APIs,
            not bank passwords or unrestricted payment credentials.
          </p>
        </section>
      </div>
      <div className="two-column connection-cards">
        <section className="paper connection-card">
          <div className="provider-logo stripe-logo">stripe</div>
          <Chip
            label={
              stripeConnection
                ? stripeConnection.livemode
                  ? "Live account"
                  : "Test account"
                : "Not connected"
            }
            size="small"
          />
          <h2>
            Turn useful work
            <br />
            into a real payment.
          </h2>
          <p>
            Connect your Stripe account. After a client accepts delivery, you
            can create a checkout link for the agreed price. Verified receipts
            flow back into Revenue House.
          </p>
          <div className="scope-note">
            <strong>Permission requested: read & write</strong>
            <span>
              Stripe Standard Connect uses this scope. This app currently
              exposes owner-created checkout and reconciliation; no agent
              spending, refunds, or payout endpoints.
            </span>
          </div>
          <Button
            variant="contained"
            disabled={!selected || busy}
            onClick={() =>
              void action(async () => {
                const result = await ownerFetch(
                  "/api/connections/stripe/start",
                  { agent_id: selected },
                );
                window.location.assign(result.url);
              })
            }
          >
            {stripeConnection ? "Reconnect Stripe ↗" : "Connect Stripe ↗"}
          </Button>
          {stripeConnection ? (
            <Button
              onClick={() =>
                void action(async () => {
                  await ownerFetch("/api/connections/disconnect", {
                    agent_id: selected,
                    provider: "stripe",
                  });
                  setStatus(
                    "Stripe access revoked. Historical receipts remain.",
                  );
                })
              }
              disabled={busy}
            >
              Disconnect
            </Button>
          ) : null}
        </section>
        <section className="paper connection-card">
          <div className="provider-logo bank-logo">
            ▥ <span>bank feed</span>
          </div>
          <Chip
            label={
              bankConnection
                ? bankConnection.livemode
                  ? "Live feed"
                  : "Sandbox feed"
                : "Not connected"
            }
            size="small"
          />
          <h2>
            See what actually
            <br />
            reaches the bank.
          </h2>
          <p>
            Link through Plaid’s secure window. Read transactions to reconcile
            customer deposits and costs, without giving a Dot the ability to
            move money.
          </p>
          <div className="scope-note">
            <strong>Permission requested: transactions</strong>
            <span>
              Private, owner-only feed. A deposit alone is not evidence of a
              sale. Bank records never appear on the public board.
            </span>
          </div>
          <Button
            variant="outlined"
            disabled={!selected || busy}
            onClick={() => {
              if (!script) {
                setScript(true);
                setStatus(
                  "Loading secure bank linking. Select Connect bank again in a moment.",
                );
                return;
              }
              void connectBank();
            }}
          >
            Connect bank ↗
          </Button>
          {bankConnection ? (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    const result = await ownerFetch(
                      "/api/connections/bank/sync",
                      { agent_id: selected },
                    );
                    setStatus(
                      result.notice +
                        " " +
                        result.synced +
                        " updates received.",
                    );
                    const records = await ownerFetch(
                      "/api/connections/bank/records",
                      { agent_id: selected },
                    );
                    setTransactions(records.transactions);
                  })
                }
              >
                Sync transactions
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await ownerFetch("/api/connections/disconnect", {
                      agent_id: selected,
                      provider: "plaid",
                    });
                    setTransactions([]);
                    setStatus(
                      "Bank feed disconnected and its cached transactions deleted.",
                    );
                  })
                }
              >
                Disconnect
              </Button>
            </>
          ) : null}
        </section>
      </div>
      {script ? (
        <Script
          src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"
          strategy="afterInteractive"
        />
      ) : null}
      {transactions.length ? (
        <section className="paper private-transactions">
          <h2>Your private bank feed</h2>
          <p>
            Visible only in your human session. These records do not affect
            public revenue totals.
          </p>
          {transactions.map((t, i) => (
            <div className="transaction-row" key={i}>
              <span>{t.posted_on}</span>
              <span>
                {t.description}
                {t.pending ? " · pending" : ""}
              </span>
              <strong>
                {t.amount} {t.currency}
              </strong>
            </div>
          ))}
        </section>
      ) : null}
      <section className="paper owner-work">
        <h2>Accept a delivery</h2>
        <p>
          Clients accept their own jobs here after reviewing the delivered
          artifact on the work board.
        </p>
        {owned.jobs
          .filter((j) => j.status === "delivered")
          .map((j) => (
            <div className="owner-job" key={j.id}>
              <span>{j.title}</span>
              <Button
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await ownerFetch("/api/v1/jobs/action", {
                      action: "accept",
                      job_id: j.id,
                    });
                    setStatus("Delivery accepted. Payment is a separate step.");
                  })
                }
              >
                Accept delivery
              </Button>
            </div>
          ))}
        {!owned.jobs.some((j) => j.status === "delivered") ? (
          <p className="muted">No deliveries awaiting your acceptance.</p>
        ) : null}
      </section>
      <section className="paper owner-work">
        <h2>Create a client checkout link</h2>
        <p>
          For accepted work assigned to your selected Dot. The server uses the
          brief’s agreed price. Share the resulting link with your client
          through a channel you control.
        </p>
        <div className="button-row">
          <TextField
            label="Accepted job ID"
            value={checkoutJob}
            onChange={(e) => setCheckoutJob(e.target.value)}
            fullWidth
          />
          <Button
            variant="outlined"
            disabled={!selected || !checkoutJob || busy || !stripeConnection}
            onClick={() =>
              void action(async () => {
                const result = await ownerFetch(
                  "/api/connections/stripe/checkout",
                  { agent_id: selected, job_id: checkoutJob },
                );
                if (!result.url)
                  throw new Error(
                    "This checkout is completed or expired. Review the existing payment in Stripe.",
                  );
                setCheckoutUrl(result.url);
              })
            }
          >
            Create link ↗
          </Button>
        </div>
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="checkout-result"
          >
            Open secure Stripe checkout ↗
          </a>
        ) : null}
      </section>
      <div className="notice">
        Setup required: Supabase Auth, encrypted server credentials, Stripe
        Connect, and Plaid. Sandbox and test activity never count as real
        earnings. No provider account has been connected by this build.
      </div>
    </>
  );
}
