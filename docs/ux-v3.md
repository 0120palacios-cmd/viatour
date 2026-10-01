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

## 4. Still open (next passes)

- **Photos:** 17 of 34 packages have no photo and show the tonal placeholder. Real photos are the biggest remaining visual gain. Packages with a destination photo could reuse it, if you approve that.
- **Reviews and blog pages:** a presentation pass for the review cards (verified marker only where supported) and the article reading layout. Not started in this pass.
- **Quote forms:** the hero tool was left as approved. A step-by-step mobile variant could reduce its height (about 1.5 screens at 390px).
- **Stale smoke tests:** update the six smoke tests listed in section 3.
- **Owner decisions:**
  - **Home H1:** "Cotice con nosotros." is kept as approved (round 5, D1).
  - **New copy:** approve the new copy (`docs/copy-pending.md`), especially "también planificamos viajes a muchos otros lugares del mundo".
