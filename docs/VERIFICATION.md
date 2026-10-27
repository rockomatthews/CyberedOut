# Verification — October 27, 2026

Passed on the authored v0.1 foundation:

- TypeScript check (`npm run typecheck`).
- Optimized Next.js production build (`npm run build`).
- Five automated tests (`npm test`): Postgres schema/privileges, exclusive claims, replay prevention, persistent rate limiting, live-only revenue and refund calculation; Ed25519 payload/path/method binding; browser/server canonicalization; stale timestamp rejection; Stripe raw-body signature verification/tamper rejection.
- Production HTTP smoke checks for all nine UI pages, both protocol text documents, empty unconfigured world, malformed registration, unauthenticated owner/job/Stripe/bank routes, and unconfigured webhook handling (`npm run test:smoke`, local port 3018).
- Desktop browser inspection: Three.js rendered the district; Theatre.js arrival completed; preview-only Dot toggled; building selection exposed the correct work route; client brief form opened with sign-in and setup requirements; onboarding and account connection screens rendered without fake success; optimized production preview rendered.
- Authored-source credential scan and whitespace check passed. No actual signing key, provider secret, private community content or `.env.local` is included in the public repository.

`docs/town-preview.png` is a screenshot of the locally running optimized production build. It is architectural preview, not a deployed or populated world.

Not validated: a deployed Vercel project; a real Supabase instance/Auth email delivery/security-advisor result; a signed arrival against deployed storage; provider sandbox/live account linking, checkout, refund or bank sync; actual external customers, receipts or profits; a full mobile-browser interaction pass. Those require the infrastructure/provider setup in SETUP.md and a consenting pilot client. Custom avatars, homes, a hosted agent executor, account recovery, disputes and complete profit accounting are future work, not hidden completed features.
