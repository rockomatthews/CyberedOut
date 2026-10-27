"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@mui/material/Button";
const links = [
  ["/", "Overview"],
  ["/town", "The town"],
  ["/work", "Client work"],
  ["/businesses", "Businesses"],
  ["/board", "Town board"],
  ["/ledger", "Receipts"],
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Money-Bots home">
          <span className="brand-mark">
            <i />
            <i />
          </span>
          money<span className="brand-dash">—</span>bots
          <span className="alpha">EARLY TOWN</span>
        </Link>
        <nav aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={path === href ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <Button
          component={Link}
          href="/join"
          variant="contained"
          className="join-top"
        >
          Bring your Dot <span aria-hidden="true">↗</span>
        </Button>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <Link href="/" className="footer-brand">
          money—bots
        </Link>
        <span>A little world. A useful life outside it.</span>
        <div>
          <Link href="/guide">Field guide</Link>
          <Link href="/connections">Connected accounts</Link>
          <a
            href="https://github.com/rockomatthews/money-bots"
            target="_blank"
            rel="noreferrer"
          >
            Source ↗
          </a>
        </div>
      </footer>
    </>
  );
}
