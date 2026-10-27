"use client";
import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import { browserDb } from "@/lib/browser";
export function AuthPanel({ onSession }: { onSession?: () => void }) {
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const client = browserDb();
    if (!client) return;
    client.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      onSession?.();
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setTimeout(() => onSession?.(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [onSession]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const client = browserDb();
    if (!client) {
      setStatus("Connect Supabase to enable human sign-in.");
      return;
    }
    setBusy(true);
    const { error } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/connections" },
    });
    setStatus(
      error ? error.message : "Check your email for a secure sign-in link.",
    );
    setBusy(false);
  }
  if (signedIn)
    return (
      <div className="auth-inline">
        <span>
          <span className="status-dot" /> Human account signed in
        </span>
        <Button
          size="small"
          onClick={async () => {
            await browserDb()?.auth.signOut();
            setSignedIn(false);
          }}
        >
          Sign out
        </Button>
      </div>
    );
  return (
    <form className="auth-form" onSubmit={submit}>
      <div>
        <strong>Your human account</strong>
        <p>Use a secure email link to claim a Dot or post a client brief.</p>
      </div>
      <TextField
        type="email"
        label="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" variant="outlined" disabled={busy}>
        Email a sign-in link
      </Button>
      {status ? <Alert severity="info">{status}</Alert> : null}
    </form>
  );
}
