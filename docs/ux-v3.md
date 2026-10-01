# viatour: V3 overhaul, first pass (discovery, promotion, motion, trust)

Date: 2026-09-30 · Branch: `v3-overhaul`. This pass builds on rounds 2–5 (`docs/ux-overhaul.md`, `docs/ux-seo-round-3.md` to `-5.md`) and does not redo their work. It follows the Design Bible and Build Brief. New strings are drafts listed in `docs/copy-pending.md` (section "Copy de la V3").

**Method:**
- Desktop (1440px) and mobile (390px) screenshots of every main route, before and after, taken with Chrome through Playwright.
- A horizontal-overflow pass at 320, 360, 414, 768 and 1024px.
- A read of the home, listing, detail and promotion code.
- A read-only query of the published packages, to see which travel styles and destinations the real catalogue supports.

---

## 1. Findings

Severity: **H** misleads or loses the visitor, **M** friction or lost opportunity, **L** polish.

| # | Sev | Finding |
|---|---|---|
| V1 | H | **The offer looked limited to eleven places.** The home page and /destinos show 11 destination tiles with nothing saying they are a selection. The catalogue already covers Japan, Greece, Egypt, Kenya, New York and more, but none of that is visible from the destinations grid. A visitor who wants another destination (User C) gets no signal that viatour can plan it. |
| V2 | H | **"Comparta su viaje y gane" was effectively hidden.** Its only entry point was a small underlined link inside the social band near the bottom of the home page. |
| V3 | M | **No way to browse by kind of trip.** Packages carry real tags (parejas 19, grupos 10, familias 9, cultura, luna de miel 4, aventura/naturaleza, cruceros), but the site only filtered by region. A visitor who does not know where to go (User B) had only the questionnaire at /descubrir. |
| V4 | M | **No search in a 34-package catalogue**, and no empty state that sells the service. |
| V5 | M | **"Mi reserva" was invisible below 1280px.** On phones and tablets it existed only inside the menu, and the home page never mentioned it (User D). |
| V6 | M | **Destination pages opened with a small photo in a two-column header**, so the most visual product on the site read like a text page. |
| V7 | M | **Package tags were raw lowercase labels** ("parejas", "familias") that led nowhere. |
| V8 | L | **No controlled motion.** The home page felt static. Skeletons blinked (`animate-pulse`). |
| V9 | L | **Fixed heading sizes jumped at 640px**; tablets got the mobile H1 or the desktop H1 with nothing in between. |
| V10 | L | `/gira` was indexable but missing from the sitemap, and had no breadcrumbs. |

**Checked and fine:** the WhatsApp handoff is already centralised (`requestQuote` captures the lead first, then same-tab `wa.me`); package prices stay hidden by `PACKAGE_DISPLAY_RULES` and no card shows `$0`; filtered package URLs canonicalise to `/paquetes`.

---

## 2. Implemented

**Home page (new order):** Hero → ¿Qué tipo de viaje busca? → Destinos (+ "¿No encuentra su destino?" tile + "Y muchos destinos más") → Paquetes destacados → Cómo funciona → Opiniones → Viaje. Comparta. Gane. → Servicios + Descubrir → Por qué viatour → Guías → Preguntas frecuentes → cierre doble (cotizar / ya tengo una reserva) → Boletín.

- **Travel styles (V3):** eight styles in `src/lib/travel-styles.ts` (Playa y Caribe, Luna de miel, En pareja, En familia, En grupo, Cultura e historia, Aventura y naturaleza, Cruceros). Each one is backed only by existing package tags or regions. The home tiles show the real package count and open `/paquetes?estilo=…`.
- **"And many more" (V1):**
  - Every destination grid (home, /destinos, "Otros destinos") ends with a brand tile, "¿No encuentra su destino?", that opens /viaje-a-medida.
  - The home grid adds "Y muchos destinos más": the other destinations the published packages cover, computed from the data and linked to their packages. Nothing is hard-coded or invented.
  - The destinations intro now says the tiles are a starting point.
- **Promotion (V2):**
  - The section is a dark panel with the four steps, the CTA "Descubra cómo participar" (to /gira), links to the three social profiles and the terms line.
  - The visual is an illustrative phone frame around a real destination photo. It shows no counts, likes or invented engagement, and its alt text says it is an example.
  - Steps and terms follow the existing /gira mechanics: approval, advisor code, one spin per trip, prizes subject to availability. No prize is promised.
  - It replaces the slim social band. `SocialReels` still renders when real post URLs are added to `siteConfig.socialVideos`.
- **Closing (V5):** two panels: "¿Está planificando un viaje?" (WhatsApp quote, lead captured first) and "¿Ya tiene una reserva?" (Mi reserva).

**Header (V5):** "Mi reserva" is visible at every width. Below 380px it is icon-only, with the name kept for screen readers. The quote action is unchanged.

**/paquetes (V3, V4):**
- **Search:** `?q=`, a GET form that works without JavaScript. It ignores accents and needs every word.
- **Filters:** travel-style chips (`?estilo=`) above the region chips. Every chip keeps the other active filters.
- **Results:** a "Resultados para «…»" line and "Quitar filtros".
- **No results:** a selling state: "No encontramos un paquete publicado con estos filtros", with a custom-trip CTA.
- **After the grid:** "¿No ve el viaje que busca?".

**Destination pages (V6):**
- **Hero:** a full-width photo hero (rounded panel) with the H1, the intro, the quote button and a white share button. The gradient sits only behind the text, and the photo drifts slowly into place.
- **Fallbacks:** with no photo, the panel falls back to brand-deep.
- **"Otros destinos":** now 3 destinations plus the "¿No encuentra su destino?" tile.

**Package pages (V7):** tags become "Ideal para:" links to the matching style filter, with proper labels.

**/gira (V10):** breadcrumbs; the same dark panel and phone visual as the home band; icon steps. The approved copy and mechanics are unchanged. Added to the sitemap.

**Footer:** "Comparta su viaje y gane" under viatour. The social glyphs moved to `src/components/social-glyphs.tsx`, shared with the promotion band.

**Design system (V8, V9):**
- **Fluid headings:** `.t-display`, `.t-h1` and `.t-h2` scale with `clamp()` between the Bible's mobile and desktop sizes (32→56, 28→40, 24→30) over 360–1200px. They use `text-wrap: balance`.
- **`.reveal-rise`:** a scroll-driven rise with a small per-column offset and no JavaScript. It is used on destination grids only. Browsers without view timelines show the content directly; reduced motion disables it.
- **`.hero-drift`:** a slow settle of the active hero photo, on the home and destination heroes.
- **`.skeleton`:** a soft sweep that replaces the blinking `animate-pulse` in the package, destination and review skeletons.
- **`.promo-phone`:** a gentle float, only on the promotion's phone visual.
- **Reduced motion:** every animation sits inside `prefers-reduced-motion: no-preference`, and the global reduced-motion rule still applies.

**Analytics (no personal data):**
- **New events:** `trip_style_click` (placement `home-{style}`), `custom_trip_click`, `promo_click`, and `reservation_click` (header, home closing).
- **Internal links:** `TrackedNavLink` is the internal-link counterpart of `TrackedLink` and keeps the locale prefix.

**Tests:** `tests/travel-styles.test.mjs` covers style lookup and matching, accent-insensitive search, and the "more destinations" rules.

## 3. Verification

- **Passing:** `npm run lint`, `npm run typecheck`, `node --test "tests/*.test.mjs"` (99/99) and `npm run build`.
- **Overflow:** none on `/`, `/en`, `/paquetes`, `/paquetes?q=…` (empty state), `/destinos`, a destination, a package and `/gira`, at 320, 360, 414, 768, 1024 and 1440px.
- **Screenshots:** the production build was checked at 320, 390 and 1440px, and with reduced motion (all content visible, no animation).
- **Smoke tests:**
  - `tests/stage10-smoke.mjs` passes.
  - Six smoke tests fail **identically on `main`**: `destinations`, `stage9`, `blog`, `hero`, `polish` and `discovery`. A baseline build of `main` was run against the same database. These tests predate rounds 2–5: they expect a draft notice that is now hidden, a seeded blog example, old hero fields and old meta descriptions. They are not regressions from this pass and should be updated or retired.
  - They need `NEXT_PUBLIC_SITE_URL=https://miviatour.com`; `.env.local` uses `http://localhost:3000`.
- **Not submitted:** forms. `.env.local` points to the real database and email.

## 4. Second pass: quote reliability, reviews, blog and tests

### Bugs found and fixed (they affect the live site)
Repairing the stale smoke tests exposed real defects in the quote flow. All existed on `main` before V3.

| # | Sev | Bug | Fix |
|---|---|---|---|
| B1 | **H** | **Compact home flight quotes were rejected.** The hero form's default service is Vuelos, and its compact view has no cabin-class field. `validateLead` required `class` for every flight, so these submissions failed with "No se pudo enviar su solicitud". Visitors who never opened "Más opciones" could not send a flight quote from the home page. | The class is optional on the server and still validated when present. When missing, the advisor sees no "Clase" line. Regression test in `tests/leads.test.mjs`. |
| B2 | **H** | **Multi-city quotes with "Otro destino" were rejected.** Choosing "Otro destino" in a segment also sends `destination-N-choice`, which the segment count read as an extra field ("Segments"). | The count matches exact segment names only (`/^(origin|destination|date)-d+$/`). Regression test added. |
| B3 | M | **"Más opciones" erased what the visitor had typed.** The compact and full layouts render different element trees, so the uncontrolled fields remounted empty. | The form keeps every typed value (it already tracked them for the summaries) and seeds the fields from it. "Otro destino" values are restored in their text field. |
| B4 | M | **The phone format check never ran.** Browsers compile `pattern` with the `v` flag, where `(` and `)` must be escaped inside a character class. The phone pattern was invalid, and Chrome silently skipped it (console error). | `[+0-9() .-]{8,40}`, checked under both the `v` and `u` flags. |
| B5 | L | **Success panel overflow.** At about 1280px, "Hacer otra solicitud" overflowed the quote success panel. | The button row wraps. |
| B6 | L | **Cramped expanded hero form.** The expanded form used window breakpoints, so it put 3 contact columns and 4 field columns inside the ~512px hero panel. | Container queries: the quote and contact grids follow the form's own width. Hero and `/vuelos` now get two even columns. |

### UX
- **Mobile hero form:** service, destination, dates and travellers sit two per row. An opened group takes the full row. The traveller summary is shorter ("2 adultos, 1 niño"). The form is about 190px shorter at 390px.
- **Blog:**
  - The newest post with a real photo leads the listing as a wide feature card.
  - The listing ends with the standard planning call to action.
  - Articles show a thin reading-progress line. It is pure CSS, and hidden without scroll timelines and with reduced motion.
- **Reviews:**
  - A short "Cómo publicamos las opiniones" note: every review is checked before publishing, and every rating can be filtered, low ones included. Both are existing behaviour.
  - The summary column is sticky only on windows at least 880px tall, so it is never cut off on laptops.
  - The page ends with the planning call to action.
- **Accessibility:** the mobile menu's close button is named "Cerrar menú" (it was "Cerrar").

### Smoke tests updated (all 7 pass)
- `stage9`: legal pages are approved, so the test checks noindex and that no draft banner shows.
- `blog`: the seed example was replaced by real posts.
- `destinations`:
  - Meta descriptions are checked under the round-5 trimming and closing-sentence rules.
  - The 404 copy is read from the messages file.
- `hero`:
  - The destination field is a select, the trip type uses radios, and the phone number is required.
  - The handoff is the "Continuar en WhatsApp" click.
  - The Turnstile mock gains `reset()`.
  - The test waits for the held capture.
- `polish`: the H1 now sits beside the tool.
- `discovery`: the phone is required, and the handoff is a click.
- **Site URL:** sitemap checks use the site URL the server was built with (`SMOKE_SITE_URL` / `NEXT_PUBLIC_SITE_URL`).
- **CLAUDE.md:** the lead-flow note was corrected (no automatic redirect).

## 5. Still open

- **Photos:** 17 of 34 packages have no photo and show the tonal placeholder. Real photos are the biggest remaining visual gain.
- **Production impact of B1 and B2:** both are fixed only once this branch is deployed. Until then, compact home flight quotes and multi-city quotes with an unlisted destination fail on the live site. Deploying soon is recommended. Check the leads inbox after deploy.
- **Owner decisions:**
  - **Home H1:** "Cotice con nosotros." is kept as approved (round 5, D1).
  - **New copy:** approve the new copy (`docs/copy-pending.md`).

## 6. Third pass: remaining pages, accessibility and performance

### Accessibility (axe-core, WCAG 2.0–2.2 A/AA + best practice; 20 pages at 1440 and 390px)
**Result:** all clean after these fixes. No colour-contrast, label or name issues were found before or after.

| Sev | Finding | Fix |
|---|---|---|
| Critical | **Broken tab-to-panel link.** The quote tabs used their service names as Radix values. "Viaje a medida" contains spaces, so the tab's \`aria-controls\` pointed at three ids that do not exist, and assistive tech could not link that tab to its panel. | Tab values are now the service keys (\`flights\`, \`customTrip\`…). |
| Serious | **Unnamed container.** The Turnstile container was a \`div\` with \`aria-label\` and no role. It appeared on every page with a form. | \`role="group"\`. |
| Moderate | **Duplicate landmarks.** Several sections had the same accessible name as the carousel or grid inside them, so landmark lists showed duplicates: home packages and guides, related packages, destination packages. | The duplicate name was removed from the outer section; the heading stays. |
| Moderate | **Content outside landmarks.** The floating WhatsApp button sat outside every landmark. | It is now an \`<aside>\` labelled "Escríbanos por WhatsApp". |

### Pages
- **Mi reserva (signed out):**
  - The access card leads.
  - Beside it, a panel lists what the portal shows: trip detail, payments, invoices, documents and support requests. These are the portal's own section names.
  - It adds the verification-code note and "¿No encuentra su código de reserva?" with WhatsApp.
  - The stray, off-centre intro line now shows only after sign-in.
- **Nosotros:**
  - The approved text is unchanged.
  - A side card lists existing facts: since 2018, a real advisor, online reservation management, and the IATA host-agency disclosure.
  - It also shows the live rating and the Google profile link (measured as \`google_profile_click\`, placement \`about\`).
- **Requisitos:** the published "Requisitos de viaje" guides are linked under the checker.
- **Hotel quote form:**
  - The destination takes the full row, with check-in and check-out side by side.
  - Adults, children and rooms share one row.

### Performance (production build, mobile 390px, 4× CPU, ~1.6 Mbps / 150 ms RTT)

| Page | FCP | LCP | CLS | JS (raw) |
|---|---|---|---|---|
| / | 2.2 s | 2.2 s | 0 | 928 KB |
| /paquetes | 1.3 s | 1.3 s | 0 | 833 KB |
| package | 1.4 s | 1.4 s | 0 | 889 KB |
| destination | 1.3 s | 1.3 s | 0 | 810 KB |
| article | 1.3 s | 1.4 s | 0 | 797 KB |

- **Layout and server time:** layout shift is zero everywhere, and TTFB is under 120 ms.
- **Largest client chunk:** 372 KB raw / 119 KB gzip, and it is mostly the Sentry SDK.
  - Sentry's \`bundleSizeOptimizations\` were tried and reverted: Turbopack ignores them, so the chunk size did not change.
  - The 150 KB markdown chunk is admin-only, not loaded on public pages.
- **Follow-up options for the Sentry chunk:**
  - **Is Sentry in use?** Confirm \`NEXT_PUBLIC_SENTRY_DSN\` is set in production. Without it the SDK ships but does nothing, and it could be removed from the client.
  - **Load it later:** with a DSN, load the client SDK lazily after the page is interactive.
