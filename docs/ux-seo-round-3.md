# viatour: round 3 of UX, performance, SEO and AI discoverability

Date: 2026-09-30 · Branch `ux-seo-round-3`. This round builds on `docs/ux-overhaul.md` (round 2) and `OPPORTUNITY-AUDIT.md`, and does not redo their work.

**Method:**
- A production build (`next build && next start`) tested at 390px and 1440px across 22 routes.
- An automated pass on every page: headings, horizontal overflow, unlabeled inputs, touch targets, image alt text, JSON-LD validity and types, console errors.
- A throttled mobile performance run: 4× CPU slowdown, ~8 Mbps with 150 ms latency, DPR 3. It measured LCP, CLS, TTFB and bytes transferred.
- A read of the SEO, structured-data and page code.

**Rules:** everything stays inside the Design Bible and Build Brief: tokens, type classes, Lucide icons, one accent, WhatsApp green only for WhatsApp, usted, no emojis, nothing invented. New interface strings are listed as drafts in `docs/copy-pending.md`.

---

## 1. Audit findings

Severity: **H** hurts customers or rankings measurably, **M** friction or lost opportunity, **L** polish.

### Performance (mobile, throttled)
| # | Sev | Finding | Evidence |
|---|---|---|---|
| P1 | H | Home LCP is **7.0 s**. The first hero photo renders with `opacity-0` and only becomes visible after React hydrates and its `onLoad` handler runs, so the largest paint waits for all the JavaScript. All three slides also download at once. | `src/components/home/hero-backdrop.tsx` |
| P2 | M | /paquetes LCP is **3.9 s**. The first package photos are in the first screen but load lazily. | `package-image.tsx`, `package-card.tsx` |
| P3 | L | Every page logs a console error: `upgrade-insecure-requests` is ignored in a report-only CSP. | `next.config.ts` |
| P4 | L | The client bundle carries Sentry tracing code while `tracesSampleRate` is 0. | `instrumentation-client.ts`, `next.config.ts` |

Other measurements were fine: detail pages LCP 1.2–1.5 s, CLS 0 on every page, TTFB under 200 ms.

### Structured data and AI discoverability
| # | Sev | Finding | Where |
|---|---|---|---|
| S1 | H | The package JSON-LD "escape" is a no-op: `"<"` in a JS string is `<`, so the code replaces `<` with `<`. Text from the database is embedded raw inside `<script>`. | `src/app/paquetes/[slug]/page.tsx:59` |
| S2 | M | Duplicate `BreadcrumbList` on detail pages. The layout emits one built from the URL slug ("Punta Cana Todo Incluido") and the page emits its own with the real title. The 404 page gets a breadcrumb for a URL that does not exist. | `site-breadcrumb-json-ld.tsx` |
| S3 | M | City pages (`/agencia-de-viajes/*`) declare the site's agency `@id` with a different `url` and a city-level `areaServed`, contradicting the main agency entity. (The /opiniones rating block reuses the same `@id` and merges correctly; that one was fine.) | `src/app/agencia-de-viajes/[city]/page.tsx` |
| S4 | M | The agency entity is thin. It has no `WebSite`, `foundingDate`, `slogan`, `email`, `knowsLanguage`, services catalogue or Google profile link, and `TouristTrip` and `BlogPosting` do not point back to it as provider or publisher. | `src/lib/seo.ts`, detail pages |
| S5 | M | `llms.txt` is a static, three-paragraph file with no links to packages, destinations, guides or policies, and there is no full-text version. AI systems have to crawl the whole site to learn what viatour offers. | `public/llms.txt` |
| S6 | M | No RSS feed for the guides, and no image entries in the sitemap. | `src/app/sitemap.ts` |
| S7 | L | Service pages (Vuelos, Hoteles, Viaje a medida) have no `Service` markup. | `src/app/vuelos`, … |
| S8 | L | The 404 page reuses the home page title and description. | `src/app/not-found.tsx` |

### UX and UI
| # | Sev | Finding | Where |
|---|---|---|---|
| U1 | H | /paquetes on a phone is **16,500 px** tall: 34 full-width cards, each about 480 px. | `package-card.tsx` |
| U2 | M | Guides without a cover photo show a large empty tonal block. Three of them sit on the home page, and most guides are about a destination that already has a real photo. | `components/blog/card.tsx` |
| U3 | M | Destination pages are thin. They have no guides, no link to the entry requirements, no social proof and no path to other destinations, although the site already holds all of this (for example, the guide "Cómo viajar a Punta Cana desde Honduras"). | `src/app/destinos/[slug]/page.tsx` |
| U4 | M | Guide pages have no reading time, no contents list, no heading anchors, no related guides and no share action. Related packages are plain text links and can repeat. | `src/app/blog/[slug]/page.tsx` |
| U5 | M | Package pages show no social proof next to the quote form, although there is a real rating of 4.4 out of 5 from 176 opinions. | `src/app/paquetes/[slug]/page.tsx` |
| U6 | L | On phones the home reviews stack into three tall cards, about 1,000 px. | `sections.tsx` |
| U7 | L | The requirements checker cannot be opened with a destination preselected, so destination pages cannot deep-link to it. | `requirements-checker.tsx` |

Checked and fine: one H1 per page, no horizontal overflow, alt text on every image, no unlabeled inputs (the two flagged are the honeypot and Radix's hidden checkbox), unique titles and descriptions, canonicals and hreflang.

---

## 2. Implementation plan

Order: correctness and speed first, then machine-readable content, then the customer-facing pages.

1. **Structured-data foundation** (S1, S2, S3, S4, S7, S8)
   - Add one `JsonLd` component that escapes correctly and use it everywhere.
   - Build a site graph: `TravelAgency` with `@id`, enriched with facts already approved (since 2018, tagline, support email, languages, services, Google profile), plus a `WebSite` entity.
   - Point `TouristTrip.provider`, `BlogPosting.publisher` and the review rating at the agency `@id`.
   - Add `Service` markup to the three service pages.
   - The layout breadcrumb covers only known static routes; detail pages keep their own.
   - Give the 404 its own title and `noindex`.
2. **AI and crawler access** (S5, S6)
   - `/llms.txt` generated from the database, following the llmstxt.org format: a summary, key facts, and linked lists of packages, destinations, guides, help and policies.
   - `/llms-full.txt` with the full text of FAQs, packages (includes, itinerary), destinations and guides.
   - `/blog/rss.xml`, announced in the page head.
   - Image entries in the sitemap.
3. **Performance** (P1–P4)
   - The first hero photo is visible from the server HTML; the other slides load only after it.
   - Preload the first package photos on listings.
   - Remove the ignored CSP directive from the report-only policy.
   - Drop Sentry tracing code from the bundle.
4. **Listings and cards** (U1, U2, U6)
   - Two-column compact package grid on phones for the full listing.
   - Guide cards fall back to the real photo of the destination they cover, and keep the tonal block only when no destination matches.
   - Home reviews become a swipe row on phones.
5. **Guide pages** (U4): reading time, updated date, contents list with heading anchors, share button, related guides, related packages as cards (deduplicated).
6. **Destination pages** (U3, U7): related guides, an "entry requirements for {destination}" card that opens the checker preselected, the real rating strip, and other destinations.
7. **Package pages** (U5): the real rating (linked to /opiniones) beside the quote form, and related guides.
8. **Verification**: typecheck, lint, unit tests, build, then a second screenshot and performance pass on the same routes.

## 3. Owner decisions (not implemented)
- **Real photos** for packages and guides that still use placeholders. The gallery for "Punta Cana Todo Incluido" opens on a cartoon-character water park, which undersells the package.
- **Review destinations:** none of the 176 published opinions has `destino` filled in. With it, package and destination pages could show opinions from travelers to that same place.
- **AI training crawlers:** `robots.txt` allows every crawler, including those that collect training data (GPTBot, Google-Extended, CCBot). This helps AI visibility. Blocking training while keeping AI search (OAI-SearchBot, PerplexityBot, Claude-SearchBot) is a business decision.

---

## 4. Implemented (2026-09-30, branch `ux-seo-round-3`)

**Structured data**
- `JsonLd` (`src/components/seo/json-ld.tsx`, serializer in `src/lib/json-ld.ts`) escapes `<`, `>`, `&`, U+2028 and U+2029. Every JSON-LD block on the site now goes through it, which fixes S1.
- Site graph in the layout (`siteSchema` in `src/lib/seo.ts`):
  - `TravelAgency` (`/#agency`) with founding year, tagline, email, telephone, languages, a four-service `OfferCatalog` and the Google profile in `sameAs`.
  - `WebSite` (`/#website`).
- Nodes that now point to the agency by `@id`:
  - `TouristTrip`: `provider`, gallery images, destination, `isPartOf`.
  - `BlogPosting`: `publisher`, author `worksFor`, `inLanguage`, `wordCount`, `about`.
  - `AboutPage`.
  - The review rating.
  - City pages, now a `Service` with a city `areaServed`.
- New `Service` markup on Vuelos, Hoteles and Viaje a medida.
- The site-wide breadcrumb only covers known static routes. Detail pages keep their own with the real title, and the 404 has none. Verified: exactly one `BreadcrumbList` per page and no conflicting `@id`s.
- The 404 has its own title and description (`seo.notFound`).

**AI and crawler access**
- `/llms.txt` is generated from published content following llmstxt.org (`src/lib/llms.ts`, `src/app/llms.txt/route.ts`). It holds:
  - a summary and key facts: model, pricing, payment, area, rating, contact;
  - linked lists of services, packages, destinations, guides, help and policies;
  - an Optional section.
- `/llms-full.txt` adds full FAQs, packages (includes, excludes, itinerary), destinations and guide bodies.
- Neither file ever contains prices (covered by a test). The static `public/llms.txt` was removed.
- `/blog/rss.xml` feed, announced in every page head.
- The sitemap lists 101 image entries and still returns static entries if a content table fails to load.

**Performance** (throttled phone, before → after)

| Page | LCP before | LCP after | CLS |
|---|---|---|---|
| Home | 7.0 s | 1.9–2.6 s | 0 |
| /paquetes | 3.9 s | 1.4–1.5 s | 0 |

- The first hero photo is visible in the server HTML, and the other slides mount after it loads (`hero-backdrop.tsx`, tests updated).
- The first two listing photos are preloaded.
- The rating badges render without `Suspense`, because streaming them in shifted the content below.
- `upgrade-insecure-requests` was removed from the report-only CSP, which ends a console error on every page.

**Listings and cards**
- /paquetes on phones is a two-column grid of compact tiles: the whole tile opens the package, and the CTA shows from 640px. Page height went from 16,564 px to about 6,100 px.
- Guide cards without a cover show the real photo of the destination their title names (`guideDestination` in `src/lib/guide-utils.ts`). Only general guides keep the tonal cover.
- Home reviews are a swipe row on phones.

**Guide pages**
- Category, lede, author, date, "Actualizado" (only when the guide changed after publication), reading time and share.
- Cover falls back to the destination photo.
- A contents list (from 3 sections) with heading anchors shared with the renderer.
- Destination chips, related packages as cards (deduplicated) and related guides.

**Destination pages**
- The real rating under the CTA.
- A "Requisitos para viajar a {destino}" card that opens `/requisitos?destino=…` with the destination preselected (the canonical stays `/requisitos`).
- Guides for the destination.
- "Otros destinos" tiles that continue the catalogue order.

**Package pages**
- The real rating in the first screen.
- A requirements link beside "Conozca más sobre {destino}".
- Related guides.

**Verification**
- `npm run typecheck`, `npm run lint`, `node --test "tests/*.test.mjs"` (89/89; new: `seo`, `llms`, `guide-utils`) and `npm run build` pass.
- Before/after screenshots at 390 and 1440 px.
- JSON-LD parsed and checked on 13 routes. No console errors except Turnstile's own log line.

**Not done**
- Sentry bundle size: `bundleSizeOptimizations` only applies under webpack, and a `compiler.define` for `__SENTRY_DEBUG__` had no measurable effect under Turbopack, so it was reverted. Revisit when Sentry supports Turbopack tree-shaking.
