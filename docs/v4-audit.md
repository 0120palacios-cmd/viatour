# viatour V4: audit and implementation plan

Date: 2026-09-30 · Branch: `v4-overhaul` (from `main` at `29f413c`). This is the fourth overhaul round. Rounds 2–5 and V3 are in `docs/ux-overhaul.md`, `docs/ux-seo-round-3.md` to `-5.md` and `docs/ux-v3.md`. They fixed most structural, accessibility, SEO and quote-flow issues, and this round does not redo them.

**Method**
- **Live site:** www.miviatour.com, 22 routes at 390px and 1440px. A Playwright crawl checked metadata, headings, JSON-LD, overflow, touch targets, console errors and response headers, plus viewport-by-viewport screenshots.
- **Code:** the full public, portal and admin code, with focused reads of the security-relevant routes.
- **Reviews:** the 24 published 1–3 star reviews, read as a customer-research source.
- **Baseline:** `typecheck`, `lint` and 101/101 unit tests pass on `main`.

---

## 1. Executive summary

The platform is technically in good shape. Every public page has:
- a canonical URL, a title and description of the right length, and valid JSON-LD;
- no horizontal overflow at 320–1440px;
- an axe-clean result.

Production sends HSTS, `X-Frame-Options: DENY`, nosniff, a Referrer-Policy, a Permissions-Policy and a report-only CSP. The lead flow is capture-first with a reference code. The portal uses OTP plus a signed, short-lived session cookie, and every query is scoped to that session's reservation.

**The biggest remaining problem is not the website's structure. It is what happens around money and after payment, and the website does not address it.**

The low-rated reviews repeat the same five concerns:

| Concern | Reviews (1–3 stars) |
|---|---|
| Taxes, destination charges or "extras" not made clear before paying | 4 |
| Quote changed at payment time; how long a rate is held was unclear | 1 |
| Change and cancellation rules unclear or felt rigid | 4 |
| Not knowing whom to contact during the trip; slow follow-up when something went wrong | 5 |
| Final documents and confirmations arrived late or had to be chased | 3 |

The site answers none of these at the point of decision.
- **Package pages:** a "No incluye" list with no mention of taxes or destination charges.
- **Home page:** the money message is "Sin letra pequeña" with no specifics.
- **FAQ:** four thin categories, with no entries on changes, cancellations, documents or travel support.

The operational side has a matching gap. **The portal promises "documents shared with you", but the admin panel has no way to share a document with a customer or to see the documents customers upload.** Today that requires the Supabase dashboard. This is the most likely root cause of the "documents arrived late" reviews.

**Top three moves**
1. **Price and fee transparency at the decision point**, built only from policies already approved in the legal pages: final price confirmed before paying, deposit conditions, supplier change and cancellation rules, and refunds.
2. **Make "after you book" a visible product.** The portal leads with the trip summary, the next step and the balance. It adds a during-trip contact card, documents that work (links that do not expire while the page is open, separated by who sent them), and an admin document panel so the advisor can actually share them.
3. **A home page that says what viatour is in the first line.** The H1 "Cotice con nosotros." names an action, not the company. The first mobile screen shows a near-black night photo. The page is 14,500px long on a phone, with three sections that repeat the same promise.

---

## 2. Strengths to preserve

| Strength | Assessment | Action |
|---|---|---|
| Real reviews: 4.4/5 from 176, with low ratings filterable and a published moderation note | The strongest trust asset. Showing the 1-star reviews openly is unusual and credible. | Keep. Surface the rating earlier on the home page. Reply to the low reviews (owner action). |
| Real human advisor ("una persona real") | The differentiator. It is clear in the hero, Nosotros and the quote panels. | Keep. Make the H1 carry it. |
| Capture-first quote flow with a `VT-XXXXX` reference and phone capture | Already fixed the lost-lead problem from the first audit. | Keep. Add a start event so abandonment can be measured. |
| Since 2018; IATA sales through an accredited host agency | Correctly worded and disclosed in the terms and footer. | Keep the wording exactly. |
| Mi reserva: OTP by email, signed 30-minute session, masked payment references | Solid security model. | Keep. Improve the hierarchy and add documents and support. |
| 34 packages with itineraries, includes and excludes; 11 destinations; 9 guides; 8 travel styles | Enough catalogue to feel large. "¿No encuentra su destino?" is already intentional. | Keep. Fix the photo issues listed below. |
| Security layer: Turnstile with a signed human cookie, DB rate limit, body limits, allowlisted payloads | Reviewed and sound. | Extend the rate limit to portal uploads. |

---

## 3. Critical problems (conversion, trust)

| # | Area | Finding | Evidence |
|---|---|---|---|
| C1 | Trust / money | **There is no fee or charges explanation where people decide.** The "No incluye" list on package pages is item-specific and never mentions taxes, airport or destination charges, resort fees or that hotel services depend on availability. These are exactly the complaints in the reviews. | Reviews; `src/app/paquetes/[slug]/page.tsx` |
| C2 | Operations / portal | **Documents can't be shared from admin.** The portal lists `portal-docs/{reservationId}/` and lets the customer upload. No admin screen reads or writes that bucket, and the storage policy denies the admin session. Customer uploads appear only as UUID file names, mixed with any agency files. | `src/app/admin/**` (no storage use); `docs/sql/portal_docs_bucket.sql` |
| C3 | Portal | **Document links expire after 5 minutes.** URLs are signed for 300 s when the page renders. A customer who opens the portal, reads, and then taps a document gets a storage error. | `src/lib/portal-data.ts` `createSignedUrl(path, 300)` |
| C4 | Portal / copy | **The "¿Necesita un cambio?" WhatsApp message is in English** ("Hello, I need a change to my reservation…") for every customer. | `src/app/mi-reserva/page.tsx` |
| C5 | Home | **The H1 does not say what viatour is.** "Cotice con nosotros." ("Get a quote." in English) is an action with no subject, service or place. It is the strongest on-page SEO signal and the first thing a visitor from Instagram reads. The round-5 audit raised it as owner decision D1. This brief asks explicitly for a first viewport that answers what viatour is. | Live crawl |

## 4. High-impact opportunities

| # | Area | Opportunity |
|---|---|---|
| H1 | Home, mobile | The first hero photo is a night skyline. At 390px the dark overlay turns it almost black, so the first screen does not read as travel. **Lead with the bright beach photo** already in `public/hero/`. |
| H2 | Home | **14,459px on a phone; three sections repeat one promise.** "Cómo funciona" (3 cards), "Por qué viatour" (6 cards) and "Servicios" (4 cards plus Discover) all say "real advisor, options for you, we explain everything". Replace the first two with one section that adds the missing substance, money transparency (C1). Fold the services into a compact row. |
| H3 | Home | **Reviews come after packages and "Cómo funciona".** The 4.4/176 proof should sit right after the discovery tiles: Journey F (comparing agencies) needs it early. |
| H4 | Portal | **The trip summary is buried.** It opens with the code, then a status bar, then two date cards. Missing: days to departure, the balance as the main money fact, "what to do next", and a during-trip contact card, which answers the "didn't know whom to contact" reviews. The payments table needs 620px and scrolls sideways on phones. |
| H5 | FAQ | **There are 11 FAQs in four thin categories.** None cover how long a quote holds, which charges are paid at the destination, changes and cancellations, refunds, documents, what happens after paying, Mi reserva, or help during the trip. All of these answers already exist in the approved legal text. |
| H6 | SEO | **Listing H1s are single words:** "Paquetes", "Destinos", "Guías", "Opiniones". The titles carry "desde Honduras", but the H1s don't. |
| H7 | Analytics | **No `quote_start` event,** so form abandonment can't be measured (starts vs `quote_submit`). Phone taps and portal access steps are not measured either. |

## 5. Medium-impact

- **Photos:**
  - "Punta Cana Todo Incluido" uses a cartoon-character water park as its cover photo. It also appears in "Paquetes destacados" on the home page and on the Punta Cana destination page. It reads as a children's park, not the "resort 5★ frente al mar" the copy describes, and it shows a licensed character. Choose another cover in admin (owner action).
  - 17 of 34 packages still have no photo (V3 note).
- **Portal upload limit:** customer uploads have no rate limit or count cap. An authenticated session could fill the bucket. This is low risk because it needs an OTP-verified session, but it is cheap to close.
- **Duplicate footer markup:** every page renders the footer columns twice, once as desktop lists and once as mobile accordions, so the HTML has two sets of "Servicios / Explorar / viatour / Cobertura" H2s. One copy is always `display:none`, so assistive tech sees one, but crawlers see the headings twice. Low risk; left as is.

## 6. Low-priority polish (later)

- **Blog H1:** "Guías" could be "Guías para viajar desde Honduras".
- **Quotation PDF:** a standard "Importante" block (rate validity, destination charges) would carry the same transparency into the document customers actually receive. The wording is a business policy, so it is listed as an owner decision and not built.
- **Network idle:** pages never reach network idle in a headless browser. A third-party script keeps polling, probably Turnstile. It has no user impact.

## 7. Technical risks

- **Storage access for admin documents needs a new SQL policy.** `docs/sql/portal_docs_admin.sql` adds admin-only select, insert and delete on `portal-docs` through `public.is_admin()`.
  - It is additive. It does not loosen anything for customers or anonymous visitors.
  - Until it runs, the admin panel shows a clear "not configured yet" message and nothing else changes.
  - Rollback: drop the three policies.
- **Document path layout changes for new files.** Agency files go to `{id}/viatour/…` and new customer uploads to `{id}/cliente/…`. Existing root files stay readable and are listed as customer uploads.
  - The retention job in `src/lib/daily-job.ts` lists only the root, so it is updated to include both subfolders.
- **FAQ changes are DB rows.** The new answers go in `data/faqs.mjs`. They reach the site only when you run `node scripts/import-faqs.mjs`, so nothing changes in production until then.
- **The home H1 replaces previously approved copy.** It is flagged in `docs/copy-pending.md` and can be reverted with one string.

## 8. Information architecture

The structure is right and stays. The header has Paquetes · Destinos · Servicios (Vuelos, Hoteles, Viaje a medida, Descubrir) · Opiniones · Blog · Nosotros · Contacto, plus Mi reserva and WhatsApp. The changes are about cross-linking:
- **Package, service, home and FAQ pages** link to the money and transparency answers, with a deep link to the FAQ category.
- **Mi reserva** links to the changes and cancellations FAQ and to the cancellation policy.
- **The FAQ** links back to Mi reserva and to the requirements checker.

## 9. Design direction

Stay inside the Design Bible: one accent, Manrope, the existing radii and shadows. This round adds no new visual language. New blocks reuse the existing card, panel and list patterns, with a different layout per context:
- **Transparency:** a two-column "confirmed before you pay / worth checking" checklist.
- **Portal:** a summary band with key facts.
- **Documents:** grouped lists.

There are no new animations.

## 10. Implementation order (this round)

1. **Trust and transparency:**
   - shared `PaymentClarity` block;
   - package "No incluye" note;
   - FAQ content (drafts);
   - FAQ category anchors.
2. **Home:**
   - H1 and intro;
   - hero photo order;
   - merge "Cómo funciona" and "Por qué viatour" into one section with the money block;
   - compact services;
   - reviews moved earlier.
3. **Mi reserva:**
   - trip summary and next step;
   - during-trip contact;
   - Spanish change message;
   - on-demand document links;
   - documents grouped by sender;
   - upload rate limit;
   - mobile payment list.
4. **Admin:** reservation documents panel and SQL policy.
5. **SEO:** listing H1s.
6. **Analytics:** `quote_start`, `phone_click`, `portal_code_requested` / `portal_verified`.
7. **QA:**
   - typecheck, lint, unit tests and build;
   - new tests for document paths, messages and events;
   - local screenshots at 320–1440px;
   - overflow pass.

---

## 11. Implemented (first pass)

**Trust and money**
- **`PaymentClarity`** (`src/components/trust/payment-clarity.tsx`): "Antes de pagar, todo claro". It lists what the advisor confirms before payment and what to check in the quote, the "no charge until you accept and pay" line, and links to `#precios-y-cargos` and the cancellation policy. It appears on:
  - the home page;
  - every package, after the itinerary, at the `#antes-de-pagar` anchor;
  - Vuelos, Hoteles and Viaje a medida.
- **Package "No incluye" card:** ends with the destination-charges note and links to the panel.
- **FAQ:** ten new questions in three categories, in `data/faqs.mjs`. They go live only when imported (see §13).

**Home page**
- **H1 and intro:** the H1 says what viatour is. The "real person" proof point is dropped because the H1 now carries it.
- **Hero photo:** the bright beach photo is first. It is the LCP image and the only one shown with reduced motion.
- **Order:** Hero → Trip styles (+ "¿Solo necesita una parte del viaje?") → Destinations → Reviews → Packages → Cómo funciona (4 steps + money panel) → Guides → FAQ → Promotion → Closing → Newsletter.
- **Removed sections:** "Por qué viatour" and "Servicios", and their components. Every point they made is covered elsewhere on the page.
- **Height:** mobile 14,459 → 13,051px; desktop 11,006 → 9,953px.

**Mi reserva**
- **Summary first:** the destination as the H1 and the days to departure. Then a band with dates, status progress and balance due, and one "Próximo paso" with its action.
- **Sidebar:**
  - "Durante su viaje": WhatsApp prefilled with the booking code, phone, an email with the code in the subject, and a link to support requests.
  - "¿Necesita un cambio?", which links to the cancellation policy.
- **Change-request message:** WhatsApp now uses the visitor's language (it was English for everyone).
- **Mobile layout:** trip items and payments are lists, not 480–620px tables.
- **Documents:**
  - grouped as "Compartidos por viatour" and "Enviados por usted";
  - opened through `GET /api/mi-reserva/documentos?ruta=…`, which checks the session and the path, then signs a 60-second URL at click time (links signed at render used to expire after 5 minutes);
  - customer uploads go to `{id}/cliente/`, limited to 20 per reservation per day;
  - photos over 4 MB are reduced in the browser, because the hosting rejects bodies over 4.5 MB (8 MB was advertised but could not be delivered).
- **Access form:**
  - "Ingresar otros datos" leaves the code step, which used to trap a mistyped code or surname for 10 minutes;
  - errors from the first step now show (they were rendered inside the hidden form).

**Admin**
- **"Documentos del viaje"** on `/admin/reservas/{id}`: share files with the customer (multiple files, up to 8 MB each), open them, and delete them with confirmation. It lists both groups.
- **How it works:** uploads go from the browser to the private bucket with the admin's session, so there is no service role and no 4.5 MB limit.
- **Needs** `docs/sql/portal_docs_admin.sql`. Until it runs, the panel lists nothing and every action shows a message naming that file.
- **Shared module:** `src/lib/portal-documents.ts` holds the folder layout and path validation for the portal, the API, admin and the retention job. The retention job now also clears the two subfolders.

**SEO:** descriptive H1s on /paquetes, /destinos, /blog, /opiniones and /preguntas-frecuentes, in both languages.

**Analytics (no personal data):**
- `quote_start`: the first focus in each quote form (hero and service pages, package, quote dialogs), once per form.
- `portal_code_requested` and `portal_verified` (once per tab).
- `whatsapp_click` and `email_click` from the portal, by placement.

## 12. Verification
- **Static checks and build:** `npm run typecheck`, `npm run lint` and `npm run build` pass.
- **Unit tests:** `node --test "tests/*.test.mjs"` gives 109/109.
  - New: `tests/portal-documents.test.mjs`, covering the path rules (other reservation, traversal, stray files), signing on demand, the upload folder and daily limit, listing, and the trip summary and next step.
  - New: `tests/analytics.test.mjs`, covering `quote_start` once per form, consent and parameters.
  - Updated: `tests/daily-job.test.mjs` (retention across both folders) and `tests/portal-hardening.test.mjs`.
- **Local production build at 320, 360, 768 and 1024px:** 15 routes, Spanish and English. No horizontal overflow and no console errors.
- **Screenshots** reviewed at 390 and 1440px: home, package, Vuelos.
- **Smoke tests against the local build:**
  - Pass: destinations, stage9, blog, hero, polish, discovery.
  - `stage10` fails only on the robots.txt site URL, because `.env.local` builds with `localhost:3000`. This is the same environment note as V3, not a regression.
- **Not verified in a browser:**
  - **The signed-in portal and the admin documents panel.** Both need a real reservation and an emailed code, or an admin login, and this session does not read real customer data. They are covered by typecheck and unit tests. Please check them manually (§13).
  - **Form submissions.** None were made, because `.env.local` points to the production database.

## 13. Owner actions
1. **Run `docs/sql/portal_docs_admin.sql`** in the Supabase SQL editor. Then open a reservation in admin, share a test PDF, and open it from Mi reserva.
2. **Approve or edit the V4 copy** in `docs/copy-pending.md`, especially the home H1.
3. **Import the FAQs** with `node scripts/import-faqs.mjs`, after reading the note in `docs/copy-pending.md` about existing answers.
4. **Change the "Punta Cana Todo Incluido" cover photo** in admin. Today it is a cartoon-character water park, shown on the home page and the destination page.
5. **Reply publicly to the 1–3 star reviews**, using the same concerns this round addresses. Do this wherever reviews allow replies (the Google profile).
6. **GA4:** mark `quote_start` and `portal_verified` as custom events. Compare `quote_start` with `quote_submit` / `generate_lead` to see form abandonment.
7. **Quotation PDF (decision):** consider a fixed "Importante" block covering rate validity and destination charges. It is not built because it would state a business policy.

---

## 14. Second pass

### Findings
| # | Sev | Finding |
|---|---|---|
| S1 | **H** | **Canonical domain conflict.** Every canonical tag, hreflang link, sitemap entry and JSON-LD `@id` uses `https://miviatour.com`. The hosting 308-redirects that host to `https://www.miviatour.com`. `http://miviatour.com` takes two hops. Search engines are told the canonical URL is one that redirects away. The fix is a hosting setting, not code (see owner actions). |
| S2 | **H** | **Destination pages missed their packages.** Matching used only an exact name or a database link that was never set for these. Six destinations linked no packages at all: Europa (8 in the catalogue), Medio Oriente (3), Cruceros (2), Panamá (1, "Cartagena y Ciudad de Panamá"), and Salinitas, which has none. Package pages could not find their region either; Egypt had no destination link. |
| S3 | M | **23 of 34 packages store "Consulte con su asesor" as their duration.** Shown with a clock icon on every card and package page, it read as missing data. |
| S4 | M | **No contextual social proof.** None of the 176 published reviews has a destination, so reviews can't be shown where they would help most. Invitations sent after a completed trip did not carry the trip's destination either. |
| S5 | L | **The structured data address gave only the country.** The approved Terms publish the city (San Pedro Sula). |
| S6 | L | **Contacto lists `soporte@` and `ayuda@` with the same label.** The visitor can't tell which to use (owner decision). |

### Implemented
- **`src/lib/destination-match.ts`:** one rule shared by destination pages and package pages.
  - A database link always wins.
  - Otherwise a name matches as a whole word ("Panamá" in "Cartagena y Ciudad de Panamá", never part of another word).
  - Region destinations match their package category (Europa, Medio Oriente, Cruceros).
  - Package pages prefer the specific place before the region. Dubái links to Dubái, Egypt to Medio Oriente.
- **Durations:** only real durations (containing a number) are shown on cards, package pages and `llms.txt` (`displayDuration` in `src/lib/display-rules.ts`).
- **Destination reviews:** each destination page has a "Opiniones de viajeros que fueron a {destino}" section with recent approved reviews naming the place. It stays hidden until such reviews exist.
  - Review invitations from completed trips now carry the destination in the link, and the form pre-selects it.
  - The destination is a place name, never personal data.
- **JSON-LD:** `addressLocality: San Pedro Sula`, `addressRegion: Cortés`. Still no street address; `areaServed` stays Honduras.

### Verification
- **Static checks:** typecheck and lint pass.
- **Unit tests:** 112/112. New: `tests/destination-match.test.mjs`, which runs against the real `data/` catalogue. Updated: daily-job (invitation destination) and llms.
- **Local build:** Europa links 8 packages, Medio Oriente 3, Cruceros 2, Panamá 1, Dubái 1. The Egypt package links Medio Oriente. The JSON-LD carries the city.
- **Screenshots:** Europa at 390 and 1440px. Nosotros, Contacto, Mi reserva and the FAQ at 390px.

### Owner actions (added)
8. **Vercel → Settings → Domains:** make `miviatour.com` the primary domain and redirect `www.miviatour.com` to it. That matches every canonical tag, the sitemap and the business listings. Afterwards, check in Search Console that the `miviatour.com` property shows the pages as indexed. If you would rather keep `www`, set `NEXT_PUBLIC_SITE_URL=https://www.miviatour.com` in Vercel and redeploy instead. Either works; they only need to agree.
9. **Reviews:** when approving reviews, add the destination wherever you know it. Reviews then appear on that destination's page.
10. **Contacto:** decide what `ayuda@` is for, or remove it from the page (`siteConfig.helpEmail`).
11. **Package durations:** fill in a real duration where one exists. Cards show it automatically.
