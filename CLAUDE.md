# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Design and product decisions live in `bible_desing.md` (Design Bible) and `build_brief.md` (Build Brief). Per-stage notes and verification steps are in `README.md` and `docs/` (`docs/admin.md`, `docs/stage*.md`, `docs/pre-launch-checklist.md`). Parts of `README.md` describe early stages and are outdated (e.g. `/api/leads` now inserts with the service-role client and sends a Resend notification) — trust the code.

## Commands

- `npm run dev` — dev server (needs `.env.local`; copy from `.env.example`). The middleware fails every request without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm run build`, `npm run lint`, `npm run typecheck` (`next typegen && tsc --noEmit`) — the standard verification trio.
- Unit tests (Node's built-in runner, no framework): `node --test "tests/*.test.mjs"`; one file: `node --test tests/leads.test.mjs`; one test: add `--test-name-pattern="<name>"`.
- Smoke tests (`tests/*-smoke.mjs`) hit a running server: `SMOKE_ORIGIN` sets the origin (default varies per file, e.g. `http://localhost:3011`). Browser smokes (`polish-smoke`, `hero-smoke`, `discovery-smoke`) need `PLAYWRIGHT_PACKAGE` pointing to an installed Playwright `package.json` and Microsoft Edge (or `HERO_BROWSER`/`DISCOVERY_BROWSER` set to another channel); they intercept leads, Turnstile and WhatsApp, so they never write real data. Sitemap checks expect URLs on the site URL the server was built with (`SMOKE_SITE_URL`, else `NEXT_PUBLIC_SITE_URL`).
- Data scripts in `scripts/` run with Node and write to Supabase using the service role, e.g. `node --env-file=.env.local scripts/import-reviews.ts <csv> --dry-run`. `.mjs` scripts load `.env.local` via dotenv. They sync content from `data/*.json|.mjs` into DB tables; they are not part of the app.
- Schema is not managed by the app: SQL lives in `docs/sql/*.sql` and is run manually in Supabase.

## Architecture

**Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before using APIs), React 19, Tailwind v4 (tokens in `src/app/globals.css`), shadcn/Radix primitives in `src/components/ui`, Supabase (Postgres + Auth + Storage), next-intl, Sentry, Resend, Cloudflare Turnstile.

**Content comes from Supabase, not files.** Packages, destinations, blog posts, FAQs and reviews are DB rows read in `src/lib/*.ts` (`packages.ts`, `destinations.ts`, `blog.ts`, `faqs.ts`, `reviews.ts`) with the anon server client + RLS. `data/` holds import sources only. Package prices exist in the model but are hidden by `PACKAGE_DISPLAY_RULES` in `src/lib/packages.ts`. Package/destination images are auto-detected from `public/paquetes/<slug>/` and `public/destinos/<slug>.jpg` by the import scripts.

**Three Supabase clients — pick deliberately:**
- `src/lib/supabase/server.ts` — anon key + user cookies; public reads and all admin-panel operations (RLS enforces access).
- `src/lib/supabase/admin.ts` — service role, `server-only`; used by public write endpoints (`/api/leads`, `/api/reviews`, …), rate limiting and the client portal. Never import into client code.
- `src/lib/supabase/client.ts` — browser.

**Lead → WhatsApp flow** (`src/lib/quote.ts`): `requestQuote()` awaits `captureLead()` (POST `/api/leads`) and returns the reference plus the `wa.me/50488668704` link with the composed message; the form then shows `QuoteSuccess` (reference + "Continuar en WhatsApp"), and the visitor opens WhatsApp with their own click. Every field a form can send must pass `validateLead` — a field the UI does not render (e.g. cabin class in the compact hero) must stay optional there. The route validates (`lead-validation.ts`), checks Turnstile/rate limit, strips unknown fields, inserts, and calls `notifySubmission()` (`src/lib/notifications.ts`, Resend). Keep this capture-first ordering.

**Public form security** (`src/lib/public-security.ts`): every public POST uses `rateLimit()` (DB RPC `hit_rate_limit`), `readBody()` size limits, and `verifyTurnstile()`. `/api/human` exchanges one Turnstile token for a signed 30-minute HttpOnly cookie (key derived from `TURNSTILE_SECRET_KEY`) so later forms skip Siteverify.

**Locales:** Spanish is default and unprefixed; English is served under `/en/*`. `src/middleware.ts` (kept despite the Next 16 deprecation warning) strips `/en`, sets `x-viatour-locale` / `x-viatour-pathname` headers, and rewrites; `src/i18n/request.ts` reads that header. Strings are in `messages/es.json` and `messages/en.json`; long legal copy is in `src/lib/legal-content*.ts`. Use `localizedPath()` from `src/i18n/config.ts` for links.

**Currency:** `viatour-currency` cookie read in the root layout and provided via `CurrencyProvider` / `useCurrency()`. Reading the cookie server-side makes routes dynamic by design.

**Admin (`/admin`)**: Supabase Auth email/password; access requires membership in `public.admins`, checked via `requireAdmin()` in `src/lib/admin.ts` (`getUser()` + `is_admin()` RPC) on every page and Server Action. Admin uses the session client, never the service role. Generic CRUD lives under `src/app/admin/(protected)/[section]`; quotations, reservations, invoicing (PDFs via `@react-pdf/renderer` in `src/lib/*-pdf.tsx`), customers, tickets and promotions have dedicated routes. The public header/footer are hidden on admin paths by `PublicChrome`.

**Client portal (`/mi-reserva`)**: OTP-based access (`src/lib/portal.ts`, signed with `PORTAL_SECRET`) for customers to view reservations, invoices, documents and support tickets.

**Other pieces:** travel-requirements checker with pluggable providers (`src/lib/requirements/`, selected by `REQUIREMENTS_PROVIDER`, falls back to offline data); consent-gated GA4/Meta pixels (`src/components/analytics.tsx`, `cookie-consent.tsx`); CSP is report-only and set in `next.config.ts` (production only); `.github/workflows/backup.yml` does a daily `pg_dump`.

## Testing approach

Unit tests don't import app modules normally: `tests/security-support.mjs` `load()` transpiles a TS file with the TypeScript compiler and runs it in a `vm` context with its imports supplied as mocks. When a module gains a new import, the tests that `load()` it must provide that dependency. Tests never touch real Supabase or send messages.

## Environment notes

Source files are UTF-8 with Spanish accents. Windows PowerShell 5.1 `Get-Content`/`Set-Content` mangle them — use the Read/Edit/Write tools for file content.
