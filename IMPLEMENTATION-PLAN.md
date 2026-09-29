# viatour — Implementation plan for OPPORTUNITY-AUDIT.md

Date: 2026-09-29 · Branch: `mobile-and-audit` · Source: `OPPORTUNITY-AUDIT.md`

This plan turns every audit finding into ordered, testable build steps. The phases are ordered by leverage and dependency: the lead-capture changes go first because the inbox, the digest and the reporting all depend on them.

## Ground rules (from AGENTS.md, the Design Bible and the Build Brief)

- **No invented copy.** Every new customer-facing string is a draft. It is listed in `docs/copy-pending.md`, added to both `messages/es.json` and `messages/en.json`, and must be approved before launch. Spanish uses usted, with no emojis, no response-time claims and no hype.
- **Design system only.** The UI/UX work stays inside the Design Bible's existing tokens, type classes, radii, spacing scale, Lucide icons and one accent colour. It improves consistency, states, responsiveness and flow. It does not change the visual identity. Anything that would change identity (new colours, a new layout language, an advisor photo) is listed as an owner decision instead.
- **Schema changes are SQL files in `docs/sql/`, run manually.** The code must keep working before the SQL is run. New columns are written with a fallback: if Postgres or PostgREST reports an unknown column, the write is retried with the legacy row, so leads are never lost. New features that read new columns degrade to "not available yet" instead of erroring.
- **Capture-first ordering stays.** The lead is saved and the notification sent before WhatsApp opens.
- **Tests.** Every behaviour change to validation, API routes or server actions gets a unit test in `tests/` using the existing `load()` harness. `npm run typecheck`, `npm run lint`, `npm run build` and `node --test "tests/*.test.mjs"` must pass at the end of each phase.
- **No commits, deploys or migrations** unless the owner asks. Work stays in the working tree alongside the branch's existing uncommitted mobile work, which must not be overwritten.

Baseline on 2026-09-29: typecheck and lint are clean. Unit tests: 51 pass and 2 fail before any change (`stage7` reviewSchema mock is missing `@/lib/seo`; `stage9` Nosotros verbatim check). Both are stale tests, fixed in Phase 0.

---

## Phase 0 — Baseline and harness
0.1 Fix the two stale tests so that regressions become visible: add the `@/lib/seo` mock to the stage7 reviews test, and investigate the stage9 Nosotros test (it compares the page with `build_brief.md` §4).
0.2 Record baseline results in this file.

## Phase 1 — Contactable, traceable leads (audit Top 10 #1, #2; §2 steps 4–5)
1.1 **Validation** (`src/lib/lead-validation.ts`): add `telefono` (required: 8–15 digits after normalisation, `+`, spaces and hyphens allowed; a local 8-digit number becomes `+504`) and `email` (optional, same rules as `contact-validation`). They apply to the hero services, package, discovery and destination/lightweight CTA branches. A lightweight CTA (a destination or final-CTA button with no form) cannot collect a phone, so those buttons open the quote panel described in 1.4.
1.2 **Reference**: the server generates `VT-XXXXX` (5 characters from an unambiguous alphabet), stores it in the row and payload, and returns it from `/api/leads`.
1.3 **API** (`src/app/api/leads/route.ts`): insert `telefono`, `email`, `referencia`, `origen` (attribution, Phase 2). On an undefined-column error, retry without the new columns (the values stay in `payload`). Response: `{ ok, id, referencia }`.
1.4 **Client flow** (`src/lib/quote.ts`): `captureLead` returns the reference. `composeQuote` appends `Referencia: VT-XXXXX`. New `QuoteSuccess` component: "Recibimos su solicitud — referencia VT-XXXXX", a primary "Continuar en WhatsApp" button (that click fires `whatsapp_click`) and a secondary "Volver". This replaces the blind `window.location.assign`. Used by the hero tool, the package form, discovery, and a new `QuoteDialog` for button-only CTAs (a destination or the final CTA opens a small sheet asking name, WhatsApp number and optional notes).
1.5 **Forms**: add a phone field (with `inputMode="tel"` and `autoComplete="tel"`), an optional email and a name to the hero, package and discovery forms. In compact hero mode the phone field is visible.
1.6 **SQL** `docs/sql/leads_contact.sql`: add the columns `telefono`, `email`, `referencia` (unique), `origen jsonb`, and `estado` values `ganado` and `perdido` plus `motivo_perdida`; add the indexes.
1.7 **Tests**: validation (phone required, normalisation, invalid rejected), route returns the reference, column fallback retry, and the message includes the reference.

## Phase 2 — Attribution (Top 10 #6)
2.1 `src/lib/attribution.ts` (client): on first page load of the session, store first-touch `utm_source/medium/campaign`, the referrer host and the landing path in `sessionStorage` (wrapped in try/catch).
2.2 Send `origen: { pagina, referrer, utm_* , landing }` with each lead. The server allowlists keys and caps lengths.
2.3 Admin shows the origin on each lead. The dashboard shows leads by source (Phase 8).

## Phase 3 — Leads inbox (Top 10 #3)
3.1 A dedicated `/admin/leads` page, replacing the generic section for leads: filters by estado (nuevo, contactado, ganado, perdido, cerrado) and servicio, search by reference, name or phone, and 25 per page.
3.2 A compact lead card showing age, servicio, destino, fechas, pasajeros, phone and reference, plus a "Ver detalle" disclosure with the full payload. `user_agent` is hidden.
3.3 Actions: "Escribir al cliente" (`wa.me/<phone>` with a prefilled draft greeting), "Crear cotización" (links to `/admin/cotizaciones/nuevo?lead=<id>`, which prefills name, phone, email, destino and notes), and estado change including `perdido` with a reason.
3.4 `lead_id` on `quotations` (SQL plus a fallback). A quotation created from a lead marks the lead `contactado`.
3.5 Tests: state allowlist, lead prefill, quotation insert with `lead_id` fallback.

## Phase 4 — Defect fixes (audit appendix D1–D9)
4.1 D1: the admin WhatsApp share after sending a quote or receipt uses the customer's phone, and is hidden when there is none.
4.2 D2: the portal session is signed with an expiry and a random nonce, and verification checks the expiry. Existing cookies become invalid, which forces a single re-login.
4.3 D3: CSP `report-uri` / `report-to` go to a same-origin `/api/csp-report` (rate-limited, size-capped, logged to Sentry without bodies containing PII).
4.4 D4: rename the "Factura" customer-facing labels to "Recibo" in the PDF, the emails and the portal. **Owner/accountant decision; implemented as draft copy.**
4.5 D5: "Encuéntrenos en Google" and the Spanish IATA line (draft copy).
4.6 D6: English SEO (Phase 6).
4.7 D7: rate limit — when a valid human-session cookie is present, key the limit on the session nonce plus IP with a higher ceiling.
4.8 D8: `/gira` uses `siteConfig.whatsappNumber`.
4.9 D9: newsletter success copy no longer promises delivery (draft copy); list export in admin.

## Phase 5 — Notification quality
5.1 The lead notification email becomes labeled lines (in the same order as the WhatsApp message) with the reference in the subject, the phone as a `wa.me` link, and a link to the admin lead. No raw JSON.

## Phase 6 — SEO (Top 10 #7; audit §4.5)
6.1 English detail pages (packages, destinations, blog) without English content: `robots: noindex, follow`, and no `en` alternate on the Spanish page. The sitemap omits `/en/` detail entries.
6.2 City pages get a quote CTA (QuoteDialog), featured packages and requirements links.
6.3 Requirements results get "¿Le ayudamos a planificar este viaje?" with a quote CTA prefilled with the country.
6.4 Publishing draft destinations that already have packages is an **owner content action**, listed in the handover.
6.5 Requirements-by-country pages are a **bigger bet**; they need hand-reviewed content, so they are deferred and listed.

## Phase 7 — Public UI/UX overhaul (within the Design Bible)
7.1 Quote buttons: an explicit "Verificando…" state while Turnstile resolves, instead of a silently disabled button.
7.2 A sticky mobile quote bar on package and destination detail pages (below 1024px), anchored to the form. It is hidden when the form is in view.
7.3 A share button (Web Share API, with a WhatsApp share URL as fallback) on package and destination pages.
7.4 A "Cómo funciona su cotización" block (3 short lines on how quoting and payment work) next to every quote form. Draft copy.
7.5 A consistent success, error and pending state component for all public forms (QuoteSuccess, shared).
7.6 Header, floating and footer WhatsApp buttons send page context ("Hola, estoy viendo <title> en su sitio…"). Draft copy.
7.7 Currency toggle: hidden while prices are hidden (`PACKAGE_DISPLAY_RULES.mostrar_precios`). The budget field keeps its own currency select.
7.8 Responsiveness pass on the new components at 360, 768 and 1280 px (browser check if available).

## Phase 8 — Admin operations and reporting (Top 10 #9; audit §4.12)
8.1 Dashboard: leads in the last 7 and 30 days, by servicio and source; quotations sent → accepted; reservations by estado; gross totals by currency for the month. Each panel degrades gracefully if columns are missing.
8.2 `comision` (net income) and `segmento` on reservations (SQL plus form fields plus fallback). The dashboard shows net income for the month.
8.3 Upsell checklist in the quotation builder: add standard lines (seguro de viaje, traslados, asistencia, tours) with one click. The advisor still enters the prices.
8.4 Newsletter CSV export for admins.

## Phase 9 — Daily automation job (Top 10 #4, #5)
9.1 `/api/cron/daily`, protected by `CRON_SECRET` (bearer), service role, idempotent. It:
   - builds the owner digest email: new leads older than 24 h, quotes `enviada` older than 3 days, quotes past `validez`, reservations with a balance due, trips starting in 7 and 30 days, trips completed without a review invitation
   - sets overdue quotes to `expirada`
   - optionally, behind `AUTO_REVIEW_INVITES=1`, sends review invitations for reservations completed at least 2 days ago that have none, reusing the existing invitation flow
9.2 `.github/workflows/daily.yml` calls it once a day (secrets `SITE_URL`, `CRON_SECRET`).
9.3 Customer reminder emails (balance, trip in 7 days) are implemented behind `CUSTOMER_REMINDERS=1`, default off, until the copy is approved.
9.4 Tests: auth required; digest queries; expiry update; idempotency keys.

## Phase 10 — Acquisition mechanics (Top 10 #10, #8)
10.1 Gira v2: step copy asks for a public post tagging @miviatour plus the post link (draft copy). The WhatsApp message asks for the link. There is no new endpoint: the advisor still approves in chat and issues the code.
10.2 Segment pages (quinceañeras, lunas de miel, grupos): **deferred**. They need approved copy and a pricing/dates decision (audit §8). A `segmento` value is accepted in leads now so the pages can be added quickly later.

## Phase 11 — Performance
11.1 A public (cookie-less) anon Supabase client for public content reads, wrapped in `unstable_cache` with tags (`packages`, `destinations`, `blog`, `faqs`, `reviews`) and a 300 s revalidate, so data-script imports appear within 5 minutes. Admin actions call `revalidateTag(tag, "max")`.
11.2 Lazy-mount Turnstile: the script loads on the first form interaction or visibility, not on page load.
11.3 Image pre-resize: an owner or developer script step, documented (not run).

## Phase 12 — Privacy and retention
12.1 Daily job, optional (`DOC_RETENTION_DAYS`, default off): delete portal documents 90 days after `fecha_fin`.
12.2 Privacy-policy text updates for phone capture and retention: **legal copy, owner approval** (listed).

## Owner-only actions (no code)
- Run the new SQL files in order (`docs/sql/leads_contact.sql`, `docs/sql/reservations_income.sql`).
- Set `CRON_SECRET` in Vercel and GitHub, and `SITE_URL` in GitHub.
- Approve the draft copy in `docs/copy-pending.md`.
- Import real reviews (`scripts/import-reviews.ts`); set up WhatsApp Business app labels and quick replies; publish draft destinations that have packages; confirm the Vercel plan; check receipt vs factura with your accountant; decide on price bands and group dates (audit §8).

## Status log (2026-09-29)

Final verification: `npm run typecheck`, `npm run lint` and `npm run build` pass. `node --test "tests/*.test.mjs"`: 78 tests, 78 pass (baseline was 53, with 2 failing). A dev-server smoke check of the key public routes returned 200 with the new elements rendered. A browser (visual) check was **not possible** because the Chrome extension was not connected, so screen-level review at 360, 768 and 1280 px is still pending (see "Verify by hand"). No lead was submitted against the real Supabase project.

| Phase | Status | Where |
|---|---|---|
| 0 Baseline | Done. Two stale tests fixed (reviews mock; Nosotros copy now read from `messages/es.json`). | `tests/stage7`, `tests/stage9` |
| 1 Contactable leads | Done. WhatsApp number required in the UI and validated on the server; optional email and name; `VT-XXXXX` reference in the row, payload, email and WhatsApp text; confirmation panel replaces the blind redirect; the column fallback keeps leads safe before the SQL runs. The server accepts leads without a phone so cached old bundles keep working. | `lead-validation.ts`, `api/leads/route.ts`, `quote.ts`, `components/quote/quote-parts.tsx`, all quote forms, `docs/sql/leads_contact.sql`, `tests/lead-contact.test.mjs` |
| 2 Attribution | Done. First-touch UTM, referrer and landing page in `sessionStorage`; allowlisted on the server. | `lib/attribution.ts` |
| 3 Leads inbox | Done. `/admin/leads`: filters, search, reference, message the customer on WhatsApp, "Crear cotización" prefill, estados ganado/perdido with a reason, `lead_id` on quotations (with fallback). The upsell quick-add is in the quotation builder. | `admin/(protected)/leads/*`, `lib/lead-admin.ts`, `quotation-builder.tsx`, `tests/lead-admin.test.mjs` |
| 4 Defects | D1 (customer WhatsApp link), D2 (portal session expiry and nonce), D3 (CSP reporting), D5 (copy), D6 (Phase 6), D7 (per-session rate limit), D8, D9 (plus newsletter CSV export) done. **D4 deferred: accountant decision.** | see files per item |
| 5 Notification | Done: labeled lead email. | `lib/notifications.ts` |
| 6 SEO | Done: English detail pages canonicalise to Spanish; sitemap is Spanish-only for database content; city pages have packages and a CTA; requirements results have a CTA. Publishing draft destinations is an owner action. Requirements-by-country pages are deferred (they need reviewed content). | `lib/seo.ts`, `sitemap.ts`, `agencia-de-viajes/[city]`, `requirements-checker.tsx` |
| 7 Public UX | Done: verifying and saving states on all Turnstile forms; sticky mobile quote bar; share button; "Cómo funciona su cotización"; contextual WhatsApp greeting; currency toggle hidden while prices are hidden. | `components/quote/*`, `share-button.tsx`, `footer.tsx` |
| 8 Reporting | Done: dashboard with leads by service and source, quotation acceptance, month sales, payments and net income; commission and segment on reservations (with fallback). | `admin/(protected)/page.tsx`, `lib/admin-reports.ts`, `docs/sql/reservations_income.sql`, `tests/admin-reports.test.mjs` |
| 9 Daily job | Done: digest and quote expiry always run; review invitations, customer reminders and document retention are opt-in by env. Scheduled in `vercel.json` (13:00 UTC = 07:00 Honduras). | `lib/daily-job.ts`, `api/cron/daily`, `tests/daily-job.test.mjs` |
| 10 Acquisition | Gira v2 copy done (draft). Referral section built but **off** (`siteConfig.referralProgram`). Segment pages deferred (need copy and a pricing/dates decision); `segmento` is already accepted on leads. | `gira/page.tsx` |
| 11 Performance | Done: cached public reads through a cookie-less client (300 s, tag-expired on admin save); Turnstile script deferred until interaction or idle. Image pre-resize is still an owner/developer task. | `lib/content-cache.ts`, `lib/supabase/public.ts`, `turnstile.tsx` |
| 12 Privacy | Retention implemented (opt-in `DOC_RETENTION_DAYS`). Privacy-policy text is an owner/legal task. | `lib/daily-job.ts` |

Extra fix found while testing: `requirements.otherDestinationHint` was missing in both locales (a runtime MISSING_MESSAGE error on `/requisitos`, already present in `HEAD`).

### Go-live order for the owner
1. Run `docs/sql/leads_contact.sql`, then `docs/sql/reservations_income.sql`, in the Supabase SQL editor.
2. In Vercel set `CRON_SECRET` (random, 32+ characters) and redeploy. Optionally set `AUTO_REVIEW_INVITES=1`, and later `CUSTOMER_REMINDERS=1` and `DOC_RETENTION_DAYS=90` once the copy and policy are approved.
3. Review `docs/copy-pending.md`.
4. Confirm that admins can read `newsletter_subscribers` (for the CSV export).
5. Existing portal sessions are invalidated once by the new cookie format; customers simply request a new code.

### Verify by hand
- On a phone: the hero form (phone field, "Verificando…" then enabled), the package page (sticky bar appears, hides at the form, then the confirmation panel and "Continuar en WhatsApp" with the reference in the text), a destination page (button opens the short form), a city page and `/requisitos` (CTA after the result).
- Submit one test lead in staging: row columns, the notification email format, `/admin/leads` (filters, "Escribir al cliente" opens the customer's number), "Crear cotización" prefill, and the lead marked contactado after saving.
- Call `/api/cron/daily` with the bearer secret in staging and read the digest.
- Watch the Vercel logs for `CSP violation` entries after deploy.
