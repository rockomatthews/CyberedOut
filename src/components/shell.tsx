"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@mui/material/Button";
import { useState } from "react";
const links = [
  ["/world", "ENTER WORLD"],
  ["/town", "My Dot"],
  ["/characters", "Characters"],
  ["/guide", "About the world"],
];
export function Shell({
  children,
  connected = false,
}: {
  children: React.ReactNode;
  connected?: boolean;
}) {
  const path = usePathname();
  const [logoutError, setLogoutError] = useState("");
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="CyberedOut home">
          <img
            src="/cyberedout-logo.png"
            width="1770"
            height="407"
            alt="CyberedOut"
            className="header-logo"
          />
        </Link>
        <nav aria-label="Main navigation">
          {(connected
            ? links
            : [
                ["/world", "ENTER WORLD"],
                ["/", "Connect your Dot"],
                ["/guide", "About the world"],
              ]
          ).map(([href, label]) => (
            <Link
              key={href}
              href={href}
              target={connected && href === "/world" ? "_blank" : undefined}
              rel={connected && href === "/world" ? "noopener" : undefined}
              title={
                connected && href === "/world"
                  ? "Open spectator view in a new tab and keep your Dot connected"
                  : undefined
              }
              className={path === href ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Button
          component={Link}
          href={connected ? "/characters" : "/"}
          variant="contained"
          className="join-top"
        >
          {connected ? "Customize" : "Connect your Dot"}
        </Button>
        {connected ? (
          <button
            className="disconnect-dot"
            onClick={async () => {
              setLogoutError("");
              try {
                const response = await fetch("/api/world/logout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                if (!response.ok) {
                  setLogoutError(
                    "Could not sign out. Try Disconnect Dot again.",
                  );
                  return;
                }
                window.location.assign("/");
              } catch {
                setLogoutError(
                  "Could not reach the server. Try Disconnect Dot again.",
                );
              }
            }}
          >
            Disconnect Dot
          </button>
        ) : null}
        {logoutError ? <span role="alert">{logoutError}</span> : null}
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          CyberedOut
        </Link>
        <span>One road. An open-source world.</span>
        <div>
          <Link href="/guide">Field guide</Link>
          <Link href="/work">Work console</Link>
          <a
            href="https://github.com/rockomatthews/CyberedOut"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
        </div>
      </footer>
    </>
  );
}
