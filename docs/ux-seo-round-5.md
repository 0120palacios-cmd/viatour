# viatour: round 5 of UX, SEO and Google presence

Date: 2026-09-30. This round builds on rounds 2–4 (`docs/ux-overhaul.md`, `docs/ux-seo-round-3.md`, `docs/ux-seo-round-4.md`) and does not redo their work. Its focus is the connection between the site and Google: Search, Search Console, Analytics, the Business Profile and local search.

**Method:**
- **Live production site:** a check of `https://miviatour.com`: redirects, canonical, hreflang, `robots.txt`, sitemap and verification tag.
- **Automated pass:** a production build tested on 21 routes at 390, 768 and 1440px. It checked overflow, headings, accessible names, touch targets, iOS zoom on inputs, duplicate ids, JSON-LD and console errors.
- **Metadata pass:** every URL in the sitemap (73) checked for title length, description length and ending, duplicates and JSON-LD validity.
- **Code read:** analytics, lead flow, review flow, structured data and the local landing pages.
- **Database read:** a read-only query of review sources.

**Rules:** Design Bible and Build Brief as always. New or rewritten strings are listed as drafts in `docs/copy-pending.md`.

---

## 1. Audit findings

Severity: **H** hurts rankings or conversion measurably, **M** friction or lost opportunity, **L** polish.

| # | Sev | Finding | Where |
|---|---|---|---|
| G1 | **H** | **Production canonical host mismatch.** The live site shows three problems. **(1)** `https://miviatour.com` answers `308 → https://www.miviatour.com`. **(2)** Every canonical, hreflang, `og:url`, sitemap `<loc>`, the `robots.txt` sitemap line and every JSON-LD `@id` point at the apex. Google is being told the canonical of each page is a URL that redirects away from it, which splits signals and can delay indexing. **(3)** The code is correct: it uses `NEXT_PUBLIC_SITE_URL`, which defaults to the apex. The fix is the domain setting in Vercel (owner action 1). | Vercel domains / `NEXT_PUBLIC_SITE_URL` |
| G2 | **H** | **34 of 40 page descriptions reached Google and social previews as broken fragments**, e.g. "…Solicite su cotización por." (home), "…Conozca más y." (about), "…Learn more and request." (every English page). `fitMetaDescription` appended "Conozca más y solicite su cotización con viatour." to anything under 150 characters and then cut at 160 on any word. Package, destination and guide descriptions (`detailDescription`) had the same pattern. | `src/lib/seo.ts` |
| G3 | **H** | **No Google verification tag in production.** `NEXT_PUBLIC_GSC_VERIFICATION` is set locally but no `google-site-verification` meta is served on the live site. Search Console is either not verified or verified by DNS; the owner should confirm (owner action 2). | Vercel env |
| G4 | M | **Leads were only custom events.** `quote_submit` and `contact_submit` are not GA4's recommended `generate_lead` nor Meta's standard `Lead`, so they cannot be used directly as a key event, imported into Google Ads, or used by Meta for optimisation. WhatsApp clicks were not Meta's `Contact`. | `src/lib/analytics.ts` |
| G5 | M | **Client-side page views sent the wrong field.** SPA navigations sent `page_view` with `page_path` (a Universal Analytics parameter GA4 ignores), and before Next.js updated `<title>`, so GA4 could file a page under the previous title. | `src/components/analytics.tsx` |
| G6 | M | **Google outbound links were not measured.** Clicks on "Encuéntrenos en Google", "Déjenos su opinión en Google" and email addresses were invisible in analytics, so review acquisition and profile traffic could not be tracked. | footer, `/contacto`, `/opiniones` |
| G7 | M | **Review acquisition gap.** After a customer submits an opinion on the site, the thank-you message was a dead end. This is the moment a satisfied traveller is most willing to also post on Google. | `src/components/reviews/form.tsx` |
| G8 | M | **The agency entity did not match the Google Business Profile.** The profile is listed as "Viatour Travel" while the site and JSON-LD say "viatour" with alternate name "miviatour". The entity had no map link and no address node, even a country-only one. | `src/lib/seo.ts` |
| L1 | M | **Local landing pages had no action in the first screen.** `/agencia-de-viajes/{city}` is the page for "agencia de viajes en San Pedro Sula" searches, and a natural Business Profile landing page. It opened with a long text block, an empty right half on desktop, and the first quote button several screens down. There was no rating, no "how it works" and no reviews. | `src/app/agencia-de-viajes/[city]/page.tsx` |
| S1 | L | **Duplicate FAQ markup.** The home page marked up its first five FAQs as a second `FAQPage` block, repeating `/preguntas-frecuentes`. Google asks for repeated FAQ content to be marked up once. | `src/components/home/sections.tsx` |
| C1 | L | **Two filler page intros.** Contact ("Contacto con sus asesores… Consulte la información disponible…") and blog ("Consulte nuestras publicaciones…") read as SEO filler rather than telling the visitor what to do or what they will find. | `messages/*.json` → `static.*` |

**Checked and fine (no change):**
- **No horizontal overflow** at 390, 768 or 1440px on any of the 21 routes.
- **Headings:** one H1 per page. The flagged H1→H3 on listings is a false positive, because each listing has a visually hidden H2.
- **Images and inputs:** alt text on every image, and no input under 16px (no iOS zoom on focus).
- **Clean pages:** no duplicate ids and no console errors apart from the expected 404 resource on the 404 page.
- **Accessible names:** the "unnamed" consent checkbox is labelled through `for=`.
- **Targets:** every flagged small target is 44px tall, above WCAG 2.5.8.

**Reviews and Google's guidelines (decision, not changed):**
- All 176 published opinions have `fuente = importado`, so they were collected on another platform.
- `/opiniones` marks them up as `Review` and `AggregateRating` on the agency.
- Google's review-snippet guidelines say markup should cover reviews collected by the site itself. Ratings a business gives about itself (`LocalBusiness`/`Organization`) never get star snippets.
- The markup brings no rich result today and carries a small policy risk. See owner decision D2.

---

## 2. Implemented

**Search snippets (G2)**
- `fitDescriptionText()` keeps text of 160 characters or fewer unchanged.
- Longer text ends on its last whole sentence that fits (from 90 characters).
- Otherwise it ends on a whole word followed by "…", after dropping trailing connectors (y, de, con, para, su, and, to, your…).
- `fitMetaDescription()` adds one short closing sentence ("Solicite su cotización con viatour." / "Request personal travel advice from viatour.") only when the text is under 110 characters and the whole sentence fits.
- `detailDescription()` (packages, destinations, guides) follows the same rules.
- **Result:** all 40 static descriptions and all 73 sitemap URLs now end cleanly. The check found no description over 161 characters, no connector endings and no duplicate titles or descriptions.
- Tests are in `tests/seo.test.mjs`.

**Analytics (G4, G5, G6)** (`src/lib/analytics.ts`, `src/components/analytics.tsx`, `src/components/tracked-link.tsx`)
- A saved quote or contact request also sends GA4 `generate_lead` (with `lead_source`) and Meta `Lead`. A WhatsApp click also sends Meta `Contact`. The existing custom events are unchanged, so current reports keep working.
- New events `google_profile_click`, `google_review_click` and `email_click`, each with a `placement`, fire on the footer, `/contacto`, `/opiniones` and the review form. They use a small `TrackedLink` client component, so the pages stay server-rendered.
- Client navigations send `page_location` and `page_title`, read 300ms after the route change. The first render is skipped so the initial page view is never counted twice.
- Nothing changed about consent: no request is made before acceptance, and no personal data is sent. Tests are in `tests/stage10.test.mjs`.

**Reviews (G7)**
- The thank-you state of the on-site review form now also offers "Déjenos su opinión en Google".
- It is shown to every reviewer the same way, whatever their rating. Google prohibits "review gating", so no invitation is conditional on the score.
- Clicks are measured.

**Structured data (G8, S1)**
- The agency node gains `alternateName: ["miviatour", "Viatour Travel"]`, so Google can tie the profile and the site to one business while the names differ.
- It also gains `hasMap` (the Business Profile URL) and `address: { addressCountry: "HN" }`. That is the correct form for a service-area business with no public street address (Design Bible §16).
- The duplicate `FAQPage` block on the home page was removed; `/preguntas-frecuentes` keeps its own.

**Local landing pages (L1)**
- **First screen:** the H1, the approved intro, the quote button and the real rating (linked to `/opiniones`). On desktop a side card lists the three approved proof points, which fills the empty half.
- **Below the local copy:** the existing "Cómo funciona" and reviews sections (real rating distribution and recent reviews), then packages and the closing call to action.
- No new text. The four published cities (San Pedro Sula, Tegucigalpa, La Ceiba, Roatán) and their English versions were checked at all three widths.

**Content (C1):** the contact and blog intros were rewritten, in Spanish and English, as drafts for approval (`docs/copy-pending.md`).

**Verification**
- `npm run typecheck`, lint on the changed files, `node --test "tests/*.test.mjs"` (95/95) and `npm run build` pass.
- On the production build: the metadata pass on 73 URLs, the layout pass on the changed routes at 390, 768 and 1440px, and screenshots of the city and contact pages.
- **Not submitted:** forms and review flows were not submitted, because `.env.local` points to the real database and email.

---

## 3. Owner actions (need your access)

### 1. Fix the canonical host (G1). Highest priority
Choose one host and make every system agree:
- **Recommended: keep `https://miviatour.com` (apex).**
  1. In Vercel, open Project → Settings → Domains.
  2. Set `miviatour.com` as the primary domain and `www.miviatour.com` to redirect (308) to it.
  3. No code or env change is needed. It matches the brand domain, the emails, `llms.txt` and every URL already in the sitemap.
- **Alternative: keep www.**
  1. Set `NEXT_PUBLIC_SITE_URL=https://www.miviatour.com` in Vercel (Production).
  2. Redeploy.
- **Verify afterwards:**
  - `curl -I https://www.miviatour.com/` should redirect to the chosen host.
  - The page source's `<link rel="canonical">` should use the same host with no redirect.
  - Use the same host in the Business Profile website field and in Search Console.

### 2. Google Search Console
1. **Verify the site.** Either add a Domain property verified with a DNS TXT record (recommended: it covers apex, www, http and https), or set `NEXT_PUBLIC_GSC_VERIFICATION` in Vercel (Production) and redeploy for the meta-tag method.
2. **Submit the sitemap:** `https://miviatour.com/sitemap.xml` (or the www form if you chose www).
3. **Request indexing** with URL Inspection for the home page, `/paquetes`, `/destinos` and the four city pages.
4. **Check the Page indexing report** a week after the host fix. "Page with redirect" and "Alternate page with proper canonical" should fall.
5. **Link Search Console to GA4:** GA4 Admin → Product links → Search Console.

### 3. Google Analytics 4
- **Environment:** confirm `NEXT_PUBLIC_GA4_ID` is set in Vercel (Production).
- **Key events:** under Admin → Events, mark `generate_lead` as a key event (conversion). Optionally mark `whatsapp_click` too.
- **Custom dimensions:** under Admin → Custom definitions, add event-scoped `service`, `placement` and `lead_source` so reports can break leads down by service and button.
- **Double page views:**
  1. Open DebugView after accepting cookies.
  2. Navigate between two pages.
  3. If you see two `page_view` events per navigation, turn off Enhanced measurement → Page views → "Page changes based on browser history events". The site already sends its own.
- **Data retention:** set it to 14 months.
- **Meta Events Manager:** confirm `Lead` and `Contact` arrive, then use `Lead` for campaign optimisation.

### 4. Google Business Profile
- **Name:**
  - The profile says "Viatour Travel"; the site, logo and legal pages say "viatour".
  - Google requires the profile name to match the real-world brand. Adding a descriptor that is not part of the name ("Travel") risks suspension.
  - Change the profile name to "viatour" unless "Viatour Travel" is the registered trade name. If you change it, tell me and I will remove it from `alternateName`.
- **Website field (after action 1):** `https://miviatour.com/?utm_source=google&utm_medium=organic&utm_campaign=perfil_empresa`. The site already stores UTM parameters with every lead (`origen`), so leads from Maps become visible in the leads inbox and GA4. The canonical tag keeps the UTM URL out of the index.
- **Phone:** +504 8866-8704, identical to the site. Add the WhatsApp link (`https://wa.me/50488668704`) wherever the profile offers a contact or booking link.
- **Category:**
  - Primary: "Agencia de viajes".
  - Add secondary categories only if they describe what you actually sell.
  - Service area: Honduras, plus the cities you really serve (the site has pages for San Pedro Sula, Tegucigalpa, La Ceiba and Roatán).
- **Services:** Vuelos, Hoteles, Paquetes de viaje and Viaje a medida. The descriptions in `agencyServices` (`src/lib/seo.ts`) can be reused.
- **Opening date and description:** opening date 2018. For the description, the agency description in the site's structured data can be adapted (up to 750 characters).
- **Hours:** add your real hours. The site states none. If you give them to me, I will add `openingHoursSpecification` to the structured data so both match.
- **Photos:** logo, cover and real photos of the team and of travellers' trips (with permission). No stock images.
- **Reviews:**
  - Reply to every review.
  - Keep sending post-trip invitations from `/admin/opiniones`; the email already includes the Google link.
  - Never offer incentives for reviews, and never ask only happy customers.
- **Posts:** a monthly post linking a package or guide keeps the profile active.
- **Verification:** complete it if it is still pending. The address used for verification is not shown publicly for a service-area business.

---

## 4. Owner decisions

- **D1. Home H1.** "Cotice con nosotros." is approved and kept. It tells a visitor from Google neither what viatour is nor where it operates; the title and description carry "Agencia de viajes… desde Honduras", but the H1 is the strongest on-page signal. A heading such as "Agencia de viajes en Honduras" with the current line as the supporting sentence would help. This needs your approval.
- **D2. Review markup.** Remove the `Review`/`AggregateRating` JSON-LD from `/opiniones` while all reviews are imported, and restore it when reviews collected on the site exist? The visible rating stays either way. The markup gives no stars today (self-review for a business), and markup of reviews from other platforms is outside Google's guidelines. Recommendation: remove it.
- **D3. Long approved descriptions.** `seo.home`, `seo.destinations` and `seo.requirements` exceed 160 characters and now end on their last full sentence (details in `docs/copy-pending.md`).

## 5. Next round
- **Google rating on the site:** show the Business Profile rating and review count with attribution, using the Places API. This needs an API key, with billing enabled.
- **Search performance in the daily owner email:** add clicks, impressions and top queries using the Search Console API. This needs a service account added as a user of the property.
- **Priority 2 city pages:** give them substantially unique content (local airport, typical routes, real reviews from that city once `destino`/city is captured) before indexing. Do not publish near-duplicate city pages.
- **Review city field:** capture the traveller's city in the review form so city pages can show reviews from that city.
- **Regular performance runs:** a Lighthouse CI or WebPageTest check on each deploy (mobile, throttled) for home, `/paquetes` and one package.
