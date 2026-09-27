# viatour — Opportunity & Viability Audit

*Scope: growth, revenue, autonomy and viability. Read-only analysis of the repository at `fc6be44` (branch `claude/laughing-hypatia-i2p0ia`), 2026-09-27. No code, data or infrastructure was changed. Every claim cites code or docs; money figures in §7 are **planning assumptions**, clearly labelled, not facts about viatour.*

*Not re-reported (known and handled elsewhere): mobile carousel/gallery issues, admin restyle, lint/type errors, missing images, unpublished draft destinations as a to-do, the `middleware` deprecation warning.*

---

## 1. Executive summary

**Verdict: viable as a boutique, high-trust advisory agency. It is not viable as a volume business at the current level of manual work.** The advisory + WhatsApp model fits the Honduran market: people already buy travel over WhatsApp, trust matters more than a price grid, and one real advisor since 2018 is a real advantage over the big online agencies (OTAs). The money is in **high-value, complicated trips** (groups and school trips, quinceañeras, honeymoons, Europe/Dubái, families, cruises). A flight-only request takes about the same advisor time and pays a fraction (§7). The platform is **overbuilt at the back of the funnel** (portal, invoicing, promo wheel, tickets) and **leaks at the front**. The weakest step is the handoff from the site to WhatsApp, where the lead loses its identity.

**The single biggest bottleneck to more booked trips:** the `wa.me` handoff. A lead saved in the database has **no phone number, no email, often no name, and no reference code** (`src/app/api/leads/route.ts:13`, `src/lib/quote.ts:12-14`). So:
1. anyone who reaches WhatsApp and does not press *Send* is **gone for good**, because the database row cannot be followed up;
2. the advisor **cannot match** an incoming chat to its lead record. They re-qualify by hand, never mark leads as contacted reliably, and cannot measure lead → booking conversion.

On top of that, the **home-page hero form cannot be submitted on its default "Vuelos" tab** (defect D2, §9).

**The three highest-leverage moves (in order):**

1. **Make every lead recoverable and traceable (≤2 days).** Fix the hero form (D2) and the discovery crash (D3). Ask for *Nombre* + *Su número de WhatsApp* on every quote form. Put a short reference (e.g. `Ref. L-7F3A`) in the prefilled WhatsApp message. If saving the lead fails, still let the visitor continue to WhatsApp instead of blocking them. This turns "lost forever" into "recoverable with one click".
2. **Turn *Leads* into a working pipeline (3–5 days).** Add a triage queue (new / waiting for their message / quoted / follow-up / won / lost) and a one-click **"Escribir al cliente"** button that opens `wa.me/<customer>` with a templated message. Add one-click **"Crear cotización desde este lead"**. Add a follow-up date and a daily digest email. Today the lead screen is a raw data dump (`src/app/admin/(protected)/[section]/page.tsx:37-39`).
3. **Real proof plus an automated customer lifecycle (1–2 weeks, mostly rules).** Import the genuine Facebook reviews now (the tool is ready: `scripts/import-reviews.ts`). Invite eight years of past WhatsApp customers to leave **Google** reviews. Then run one daily cron job that sends rule-based emails: lead acknowledgement, quote-expiry follow-up, payment due, documents checklist, pre-trip, post-trip review invitation, and the anniversary "¿A dónde este año?" nudge. No AI needed.

**Do today, unrelated to growth:** the repository is **public**, and `.github/workflows/backup.yml:30-35` uploads an **unencrypted full database dump** (leads, customers, payments) as a GitHub Actions artifact every day. Any signed-in GitHub user can download public-repo artifacts. See D1.

---

## 2. The lead-to-booking path

Ordered by where the funnel leaks. ⛔ = a step that loses leads, ✋ = manual advisor work the platform could do.

| # | Step | Where in code | What happens today | Leak / manual work | How to reduce it |
|---|---|---|---|---|---|
| 0 | **Arrival** | SEO: `src/app/sitemap.ts:10-12`, city pages, blog (9 posts); social links `src/lib/site-config.ts:15-18` | Organic, Facebook/IG/TikTok, word of mouth, Google Business Profile | No source is recorded on the lead (no UTM/referrer anywhere in `src/`) | Save `utm_*`, `document.referrer` and the landing path into `payload` (Top-10 #8) |
| 1 | **Browsing** | `/paquetes` flat grid, `src/app/paquetes/page.tsx:10`; city pages have **no quote CTA** (`src/app/agencia-de-viajes/[city]/page.tsx`); requirements tool has **no CTA** (`src/components/requirements/requirements-checker.tsx`, 59 lines, no WhatsApp/lead hook) | 34 packages, no filters by trip type; high-intent tools end in a dead end | ⛔ High-intent visitors (checking visa rules, local "agencia de viajes en X") get no next step | Add the package-style mini form to city pages, destination pages and requirement results |
| 2 | **Quote form** | Hero: `src/components/home/sections.tsx:34` → `FlightTool compact`; form `src/components/home/flight-tool.tsx:31-36` | Hero defaults to **Vuelos** in collapsed mode | ⛔ **D2:** the required *Clase* select is `display:none` in collapsed mode, so the browser blocks submit and shows "Revise los campos obligatorios" with no visible field. ⛔ Every submit button stays **disabled until Turnstile resolves** (`flight-tool.tsx:36`, `quote-button.tsx:20`, `package-quote.tsx:64`) with no explanation, which is slow on 3G. ⛔ **D3:** discovery results crash when "Gastronomía" is selected | Fix D2/D3. Keep the button enabled and verify on click with a visible "Verificando…" state |
| 3 | **Capture** `POST /api/leads` | `src/app/api/leads/route.ts:6-19`; `src/lib/public-security.ts:9-18` | Saves the row, emails support, returns an id | ⛔ Any failure (Supabase slow, rate-limit RPC down → 503, Turnstile error) **throws before navigating** (`src/lib/quote.ts:33`), so the visitor sees an error and **never reaches WhatsApp**. ⛔ 10 leads/hour per IP; Honduran mobile carriers put many users behind shared (CGNAT) IPs | On failure, show "Continuar por WhatsApp" anyway. The WhatsApp message carries the full request, so no lead is lost (see §8 note) |
| 4 | **Handoff** `wa.me` | `src/lib/quote.ts:32-37` | Opens WhatsApp prefilled; `captureLead` **drops the returned id** (`quote.ts:17-30`, returns `void`) | ⛔⛔ **Biggest loss point.** Visitors who don't press *Send* leave an anonymous row. Package leads carry no name at all (`package-quote.tsx:39`); in the hero, *Nombre* is optional and hidden in collapsed mode | Ask for name + WhatsApp number. Put `Ref. L-XXXX` in the message. Add a "Pendientes de mensaje" list in admin with one-click `wa.me/<customer>` recovery |
| 5 | **First reply** | Notification is `JSON.stringify(fields)` in a plain email (`src/lib/notifications.ts:25-35`) | Advisor reads the chat, then maybe digs through the admin panel | ✋ Must find the lead by guesswork; re-asks origin/dates/passengers when a destination or FinalCta button sent an empty payload (`sections.tsx:55` sends `fields: {}`) | Readable email (labelled lines + deep link to the lead). Every CTA collects the minimum four facts: origin, month, passengers, contact |
| 6 | **Build the quote** | `src/app/admin/cotizaciones/actions.ts:28-57` | Retypes client name/email/phone. Line items typed from scratch. No `lead_id` link | ✋ 30–60 min per quote. Duplicate customers. Conversion can't be measured | "Crear cotización desde lead" (prefill + `lead_id`); a reusable **item library** (insurance, transfers, fees); per-package quote templates |
| 7 | **Send the quote** | `sendQuotation` `actions.ts:70-96` | Emails a PDF; shows "Compartir por WhatsApp" | ✋/defect **D4:** the button opens `wa.me/50488668704`, the **agency's own number**, not the customer's (`actions.ts:94-95`). No follow-up when `validez` lapses | Link to `wa.me/<cliente_telefono>`; automatic day-2 / day-5 / expiry follow-ups |
| 8 | **Booking & payment** | `src/app/admin/reservas/actions.ts:53-137` | Accepted quote → reservation → payments → "Factura" | ✋ No payment-due reminders. The portal code is never sent to the customer automatically. **D5:** portal lookup relies on `cliente_apellido`, which the app never writes | Auto-email the reservation code + portal link on confirmation; payment reminders from `fecha_vencimiento` |
| 9 | **Trip & after** | `fecha_inicio`/`fecha_fin` on reservations; invitations `src/lib/review-invitations.ts` | Nothing happens automatically | ⛔ Loses reviews, referrals and repeat trips, which are the cheapest leads there are | Pre-trip checklist, post-trip review invitation, referral code, 11-month "next trip" nudge |

**Where leads are lost, ranked:** (4) handoff without identity › (2) hero defect + disabled buttons › (3) blocked on capture failure › (1) dead-end pages › (9) no post-trip loop.

---

## 3. Top 10 opportunities, ranked

All respect the locked constraints: advisory, WhatsApp-first, no AI, no invented content, prices and dates hidden unless the owner decides otherwise (§8).

| # | What | Why it matters (mechanism) | Hooks in | Effort | Impact | First build step |
|---|---|---|---|---|---|---|
| 1 | **Lead identity + recovery**: required *Nombre* + *WhatsApp* on all quote forms, `Ref. L-XXXX` in the prefilled message, "sin mensaje" recovery list | Converts silent drop-offs into leads the advisor can recover. The ref code lets the advisor paste it into admin search and see the full request. Unlocks conversion measurement | `src/lib/quote.ts:7-37` (return the id; add ref line), `src/lib/lead-validation.ts:50` (name optional today), `src/app/api/leads/route.ts:13` (add `telefono`, `ref` columns) | S–M | **Leads +, conversion +, time saved** | Change `captureLead` to return `{id}`, derive `ref = id.slice(0,4).toUpperCase()`, append `Ref.: L-${ref}` to `composeQuote` |
| 2 | **Unblock the forms**: fix D2 (hero), D3 (discovery), enable-then-verify Turnstile, fail open to WhatsApp | The home hero is the highest-traffic form and its default tab can't submit collapsed. Disabled buttons with no reason read as "broken" on slow connections | `flight-tool.tsx:36`, `discovery-data.ts:71,89,92` + `assistant.tsx:18-21`, `quote-button.tsx:20`, `package-quote.tsx:64`, `quote.ts:33` | S | **Conversion ++** | Remove `required` from the `class` select when `compact`, or default it to "Económica" |
| 3 | **Lead pipeline in admin**: states, filters, next-follow-up date, "Escribir al cliente", "Crear cotización" | The admin is the advisor's cockpit. Today it is a JSON viewer with 3 states (`src/app/admin/actions.ts:69`) and no filter for leads (`src/lib/admin.ts:24-25`) | `[section]/page.tsx:37-39`, `lib/admin.ts:21-29`, `cotizaciones/nuevo` | M | **Time saved ++, conversion +** | Add `estado ∈ {nuevo, esperando_mensaje, en_conversacion, cotizado, seguimiento, ganado, perdido}` + `motivo_perdida` + `proximo_contacto`; add a filter nav like the reviews one (`page.tsx:53`) |
| 4 | **One daily rule-based automation job** | Replaces the advisor's memory. Reminders, follow-ups and review requests are where solo agencies lose money quietly | New protected route `/api/cron/daily`, triggered by the existing GitHub Actions scheduler (`.github/workflows/backup.yml` pattern) or Vercel Cron; sends via `sendResendEmail` (`notifications.ts:14`) | M | **Time saved ++, revenue +, reviews +** | Start with 3 rules: (a) daily 7:00 digest to the advisor (new leads, follow-ups due, quotes expiring); (b) quote not answered 48h → customer email; (c) `fecha_fin + 3 días` → create and send review invitation |
| 5 | **Real reviews, now** | Zero reviews live (`sections.tsx:45` empty state). Trust is the product. Google reviews also drive local ranking | `scripts/import-reviews.ts` (ready), `siteConfig.googleReviewUrl` (`site-config.ts:8`), invitations `src/components/admin/review-invitation-form.tsx` | S (mostly owner time) | **Conversion ++, SEO +** | Export genuine Facebook recommendations to `data/reviews-import.csv` (real names/dates, as the brief requires) and run with `--dry-run` first |
| 6 | **Productized segment offers**: Grupos y viajes estudiantiles, Quinceañeras, Lunas de miel, Viajes en familia | These segments produce most of the net revenue per advisor hour (§7). Dedicated pages with a structured intake qualify better than a generic tab | New routes reusing `ServicePage` (`src/components/services/service-page.tsx`); package `etiquetas` already exists in the schema (`src/lib/packages.ts:8`) | M | **Revenue ++, lead quality ++** | Group intake form: organizer name + WhatsApp, group size, age range, preferred month, budget band, institution (optional) |
| 7 | **Requirements → leads + SEO**: cache results, add an advisor CTA, publish "Requisitos para viajar a {país} desde Honduras" | Very high search volume, weak OTA competition, strong buying intent. Today every check hits the paid API with `cache: "no-store"` (`src/lib/requirements/travelbuddy.ts:123`) and falls back to only 4 offline countries (`offline-data.json`) | `src/app/api/requisitos/route.ts`, `requirements-checker.tsx` | M | **Leads +, SEO ++, cost −** | Store each `(passport, destination)` result in a Supabase table with `checked_at`; serve for 30 days |
| 8 | **Attribution on every lead** | Without source data the owner can't tell whether Facebook, Google Business, SEO or TikTok produces booked trips, so marketing spend is blind | `quote.ts:18-25` (add `source` to body), `lead-validation.ts` (allowlist `utm_source/medium/campaign`, `referrer`, `landing`) | S | **Better decisions** | On first page view, store `utm_*` + referrer in `sessionStorage`; attach to the `captureLead` body |
| 9 | **Reporting that runs the business** | The dashboard only counts rows (`src/app/admin/(protected)/page.tsx:7`). The owner can't see conversion, revenue or **commission** by segment/destination | Add `comision` (amount or %) to reservation items; `lead_id` on quotations | M | **Decisions ++, revenue +** | One report page: leads by week × source × service; lead→quote→booking %; payments by month; commission by destination |
| 10 | **Sharing + referrals**: "Compartir por WhatsApp" on packages/destinations; referral field; rework `/gira` into public posting | Customers already forward trip ideas to family on WhatsApp. `/gira` today asks for the video **privately over WhatsApp** (`src/app/gira/page.tsx:16-18`), so the customer's own followers never see it | Package page aside (`paquetes/[slug]/page.tsx:67`), `/gira` copy, `promo_spins` | S | **Leads + (cheap)** | Share button `https://wa.me/?text=<title + URL>`; lead field "¿Quién le recomendó viatour?" (optional) |

---

## 4. Findings by area

### 4.1 Overall viability

**Current state.** Advisory agency, host-agency IATA ticketing (`src/lib/legal-content.ts:15`), no online payment, prices and dates hidden (`src/lib/packages.ts:13-16`), a single WhatsApp number (`site-config.ts:7`). Since 2018 with a Facebook/WhatsApp customer base (Build Brief §4).

**Where revenue comes from.** Commissions from wholesalers and operators on packages, hotels and cruises, split with the host agency; per-ticket service fees on flights (airline base commissions to agencies are near zero in most markets); commissions on travel insurance and transfers. **Groups, quinceañeras and long-haul trips bring the most net revenue per hour of advisor time; flight-only requests bring the least** (§7).

**Existential risks.**
- **Single host agency.** All air ticketing and IATA legitimacy depend on one partner (`legal-content.ts:15`). A contract change or termination stops sales. *Mitigation:* have a second host or consolidator relationship identified, and keep your own supplier logins (wholesalers, cruise lines) in viatour's name where possible.
- **Single advisor.** Capacity caps revenue at roughly 10–15 advisor-hours per booked high-value trip (§7). When the one person is sick or travelling, sales stop. *Mitigation:* §8 decision D-4.
- **Seasonality.** Demand clusters around Semana Santa, the July–August school break, the October Semana Morazánica and December. Leads come in waves the single advisor can't absorb. *Mitigation:* automation (#4) and campaign pages published 8–12 weeks ahead.
- **Brand confusion.** "viatour" sits one letter from **Viator** (TripAdvisor's tours marketplace), and the Google Business Profile is named **"Viatour Travel"** (`site-config.ts:9`). The Design Bible (§1) forbids "Viatour". Branded searches can be autocorrected or land on Viator. *Mitigation:* rename the GBP to match the real signage "viatour"; Google's name rules also penalise added descriptors. Use "viatour — agencia de viajes en Honduras" consistently in titles and social bios.
- **Zero public proof** (4.3).
- **Hosting terms.** If the project runs on **Vercel Hobby**, Vercel's terms restrict Hobby to non-commercial use. A travel agency is commercial. Verify the plan; budget for Pro if needed.

**Recommended actions.** Keep the model. Steer marketing and site structure toward the high-value segments (Top-10 #6). Make the platform do the qualifying and follow-up (Top-10 #1, #3, #4).

### 4.2 Lead generation & qualification (top priority)

**Current state.** Four quote entry types feed one endpoint (`lead-validation.ts:4`): hero/service tool (Vuelos/Hoteles/Paquetes/Viaje a medida), package form, destination button, discovery, plus contact (the only form that collects email/phone, `contact-validation.ts`). Lead fields: service, name (optional), origin, destination, dates, passengers, class, budget, notes, `payload`, `user_agent` (`api/leads/route.ts:13`).

**Gaps.**
- **No contact identity on quote leads.** You can't follow up, deduplicate, or recognise a returning customer.
- **No reference linking chat ↔ lead** (`quote.ts:12-14`).
- **Data-poor CTAs.** The destination button sends only the destination name (`destinos/[slug]/page.tsx`, `QuoteButton payload={{ fields: { Destino } }}`). The home FinalCta sends `fields: {}` (`sections.tsx:55`), so the database collects empty rows and the advisor starts from zero.
- **English messages are half-translated.** Only the "Paquete" service is translated for English users (`quote.ts:8-11`); every other English-UI quote arrives with Spanish labels. That is harmless for the advisor, but the English visitor sees Spanish in their own outgoing message.
- **Support notification is a JSON dump** (`notifications.ts:32`), which is hard to read on a phone.
- **No triage or priority.** A 30-person school trip and a one-way ticket look identical in admin.
- **Discovery works well as a qualifier, but it is broken** (D3) and its results only offer "send to WhatsApp". It never asks for name or contact.

**Opportunities.**
1. A **minimum qualifying set** on every quote path: origin, month/dates, passengers, name, WhatsApp number. Destination and FinalCta buttons should open the same mini form the package page uses (`package-quote.tsx`) instead of firing an empty lead.
2. A **rule-based lead score** computed on insert (no AI): passengers ≥ 8 (+3), service ∈ {Paquete, Viaje a medida, descubrimiento} (+2), long-haul destination (+2), dates within 30–120 days (+2), budget given (+1), flight one-way (−1). Sort the admin queue by score. It hooks in right after validation in `api/leads/route.ts:13`.
3. **Readable notification**: subject `Nueva solicitud L-7F3A — Paquete Punta Cana, 4 pax, dic.`, labelled lines, a deep link to `/admin/leads/<id>`, and the customer's `wa.me` link.
4. **Recovery list:** leads with `estado = esperando_mensaje` older than 30 minutes appear in admin with an "Escribir al cliente" button. The message template is prefilled with the ref and the request summary. Sending it is still a human action in the WhatsApp Business app, which respects the advisory model.

**Single biggest lead-loss point:** step 4 in §2, the handoff without identity or reference.

### 4.3 Conversion rate optimization

**Current state.** Every price shows "Solicitar cotización" (`package-price.tsx:3`; both branches render the same text). Reviews: zero live. "Cómo funciona" is three generic steps (`messages/es.json:87-93`) that never explain **how payment works**. Trust signals: "Una persona real lo asesora" (`es.json:105-106`), IATA-via-host (`es.json:57`), Google profile link.

**Gaps.**
- **The value of a hidden price isn't explained.** The customer can't tell what the quote will contain, how long the price holds, or how they pay without online checkout. For a first-time buyer, "how do I pay a stranger on WhatsApp?" is the biggest objection, and the site doesn't answer it.
- **No proof.** Zero reviews and no named person. The site says "una persona real" but never shows who.
- **Friction:** D2, the disabled buttons, and the `required` free-text "Fechas" field on the package form (`package-quote.tsx:57`). Customers who don't have dates yet are forced to invent something.
- **Honest urgency is missing.** Real deadlines exist (quote validity, group space cutoffs from operators, airline fare changes) but none of them appears.

**Opportunities / actions.**
1. Add a **"Cómo reservamos con usted"** block on package pages and in the FAQ: what the quote includes (itemised PDF like the one generated by `src/lib/quotation-pdf.tsx`), that prices are confirmed at quote time, payment by card or bank transfer recorded by the advisor, a receipt for every payment, and the reservation portal where they can see their payments and documents (`/mi-reserva`). All true, and it turns back-office features into trust. *Copy to be drafted and flagged for owner approval.*
2. A **real advisor identity**: a photo and first name of the actual advisor on `/nosotros` and in the package aside. Only if the owner approves it; it must be real.
3. Make "Fechas" optional with a hint ("Si aún no las tiene, indique el mes").
4. **Reviews** (Top-10 #5) plus the Google rating link near every quote form. Only show a rating once real reviews exist, as the current code already does.
5. **Honest urgency, only when it is real:** show the quote's own `validez` in the follow-up email; seasonal "Planifique su Semana Santa" pages published 8–12 weeks ahead; "Cupos de grupo sujetos a disponibilidad del operador" on real group departures.

### 4.4 Customer acquisition (product-driven)

**Current state.** 4 published city pages (Priority 1), 11 more written but `noindex` (`docs/city-copy.md`, `src/lib/city-seo.ts:43`). 9 blog posts. Social embeds empty (`site-config.ts:19-24`). `/gira` promo. Newsletter storage (`api/newsletter/route.ts:10`), with **nothing ever sent** to subscribers.

**Gaps.**
- **No share affordance** on packages or destinations.
- **`/gira` isn't an acquisition engine.** The video goes privately to viatour (`gira/page.tsx:16`). The customer's network never sees it, and only viatour's own accounts benefit once reposted.
- **Prize economics need a check.** "10% de descuento en su próxima cotización" at 8% weight (`src/lib/promo-wheel.ts:6`) can cost as much as the agency's whole commission on that booking (§7). Traslado and equipaje have real costs too.
- **No referral mechanic**, even though word of mouth is how viatour grew (Build Brief §4).
- **The newsletter is dead weight** until something is sent.
- **Google Business Profile** is linked, but reviews and posts there are the strongest local signal, and nothing feeds it.

**Actions.**
1. A "Compartir por WhatsApp / Facebook" button on package and destination pages. The OG image already uses the package photo (`paquetes/[slug]/page.tsx:33`).
2. Rework `/gira`: the customer **posts the video publicly** tagging @miviatour (TikTok `site-config.ts:18`, Instagram), then sends the link on WhatsApp to get their code. Same wheel, same admin flow (`src/app/admin/promociones`). Replace the 10% prize with a fixed-value credit that fits your commission (owner decision; the copy needs approval).
3. **Referral:** an optional "¿Quién le recomendó?" field on lead forms, plus a referrer credit issued as a promo code through the existing `promo_spins` table. Deterministic and cheap.
4. **Newsletter:** a seasonal email 4–6 times a year (Semana Santa, vacaciones de medio año, Semana Morazánica, Navidad) using Resend. The content must be real packages.
5. **GBP routine:** post each new package or guide, and ask every returning traveller for a Google review (automated by #4).

### 4.5 SEO

**Current state.** Solid technical base: per-page metadata, canonical/hreflang (`docs/pre-launch-checklist.md:359`), TravelAgency/TouristTrip/Breadcrumb/FAQ/BlogPosting JSON-LD with **no price emitted** (`paquetes/[slug]/page.tsx:51`, correct), dynamic sitemap (`sitemap.ts`), `/llms.txt`.

**Gaps.**
- **The 29 draft destinations are not ready-made SEO pages.** **0 of 29 have a body or FAQs** (`data/destinations.json`). Publishing them now would create thin pages that can hurt the whole site. They are a content backlog, not free rankings.
- **English duplicates.** The sitemap emits `/en/...` for every package, destination and post (`sitemap.ts:11-12`), but database content isn't translated. Google sees Spanish pages declared as `en`. That wastes crawl budget and can make Google group the pages as duplicates.
- **City pages** are about 3 paragraphs of similar copy with no CTA, packages, or local facts. Google treats near-identical location pages as "doorway pages". The 11 Priority 2 pages would add to that risk if published as they are.
- **Conflicting entity data.** City JSON-LD reuses `@id: /#agency` with a different `url` and `areaServed` (`agencia-de-viajes/[city]/page.tsx`), which contradicts the root definition.
- **Requirements.** "Requisitos para viajar a X desde Honduras" is the highest-intent, least-OTA-contested query class, and the site has no pages for it (only a client tool).

**Can the content rank against OTAs?** Not on "vuelos baratos a Miami"; that's a lost fight. It **can** win long-tail Honduran intent: "requisitos para viajar a Colombia desde Honduras", "paquete a Punta Cana desde San Pedro Sula", "viaje de quinceañera a Cancún desde Honduras", "excursión de graduación desde Tegucigalpa", "¿necesito visa para Dubái con pasaporte hondureño?". OTAs don't write Honduras-specific answers.

**Highest-ROI SEO move for a solo owner:** **country requirement pages** built from cached requirement data (Top-10 #7) plus an editorial paragraph written by the owner, each ending with the package mini form. Second: complete and publish the drafts one per week, starting with those that already have packages (e.g. Medellín/Santa Marta). Third: `noindex` the `/en` versions of database-driven pages until translated, and drop them from the sitemap.

### 4.6 Automation & the advisor's time (rule-based only)

**Current state.** Nothing runs on a schedule except the backup. Emails are sent only by explicit admin clicks: quote, invoice, invitation (`cotizaciones/actions.ts:70`, `reservas/actions.ts:151`).

**Ranked by estimated advisor hours saved per week** (at ~60 leads/month and ~8 bookings/month):

| Rule | Trigger (existing data) | Est. saving | Notes |
|---|---|---|---|
| Structured lead + ref + one-click chat | on insert | **2–3 h/wk** | Removes re-qualifying and searching |
| Morning digest to advisor | daily | 1 h/wk | Replaces checking admin and email |
| Quote follow-up (48h, day 5, expiry) | `quotations.estado='enviada'`, `validez` | 1–2 h/wk + **conversion** | Uses the quote's own date; honest urgency |
| Payment-due reminder | `invoices.fecha_vencimiento` | 0.5–1 h/wk | Also cuts cash-flow delays |
| Reservation confirmation with portal code | `reservations.estado→confirmada` | 0.5 h/wk | Also fixes the portal's discoverability |
| Pre-trip checklist (T−30, T−7) | `fecha_inicio` | 0.5 h/wk + fewer emergencies | Deterministic checklist per destination, linking `/requisitos` |
| Post-trip review invitation (T+3) | `fecha_fin` | 0.5 h/wk + **reviews** | Reuses `review_invitations` |
| Anniversary nudge (T+11 months) | `fecha_fin` | revenue | Repeat trips are the cheapest bookings |

**Quote scaffolding (no AI):** an item library (seguro de viaje, traslado, cargo por servicio, impuestos) and "duplicate quotation" so a Punta Cana quote becomes the next Punta Cana quote in 5 minutes. It hooks into `src/components/admin/quotation-builder.tsx`.

**WhatsApp Business API** (unpark it?): **not yet.** First get #1–#4 working with the free WhatsApp Business *app* (labels, quick replies matching the ref-code message, catalog of packages). Revisit when leads exceed ~150/month or reminders need to arrive on WhatsApp rather than email (see §6).

### 4.7 UX / UI (forward-looking)

**Strengths.** The site follows the Design Bible: one accent, no emojis, Lucide icons, real photos in `public/paquetes` and `public/destinos`, advisor-voice copy.

**Gaps.**
- "Real human advisor" is **said** but never **shown**: no name, face or signature.
- The hidden-price value proposition isn't explained (4.3).
- The **home page has 14 sections** (`src/app/page.tsx:7`). On mobile, reviews, trust and FAQ sit far below the hero, and one of them is an empty reviews box. Until reviews exist, move *Por qué viatour* and *Cómo funciona* up, and hide the empty reviews teaser instead of showing "Aún no tenemos opiniones".
- The path to WhatsApp **isn't effortless** in its most important place (D2, disabled buttons).
- The generic WhatsApp message "Hola, me gustaría recibir asesoría para un viaje." (`src/lib/navigation.ts:31-34`) carries no page context. The float button on a package page should say which package.

**Actions.** Pass page context to `WhatsAppLink` (package or destination name). Trim the home order. Add the "Cómo reservamos con usted" block.

### 4.8 Functionality & product gaps

**Missing features customers will expect:**
- sharing (4.4);
- **filters** on `/paquetes` by trip type (the `etiquetas` column exists, but the admin form can't edit it: `src/components/admin/forms.tsx:46` covers only basic fields);
- a clear **"cómo se paga"**;
- package comparison: low priority, since the advisor compares for them;
- a wishlist: skip; WhatsApp *is* the wishlist.

**Built but underused:**
- **Portal** (`/mi-reserva`): complete (status, items, payments, balance, receipts, documents, tickets), but customers only learn their code if the advisor tells them, and login may be broken (D5).
- **Discovery:** broken (D3), and results don't collect contact details.
- **Requirements:** no CTA and no caching.
- **Promo wheel:** private and one-off.
- **Newsletter:** never sends.

Fix and connect these before building anything new.

**Currency:** the USD/HNL toggle does nothing visible while prices are hidden (`package-price.tsx:3`), yet reading it makes every page dynamic (4.9). Either hide the toggle until prices show, or keep it only for the budget field.

### 4.9 Performance (mostly-mobile, 3G/4G)

**Current state.** Images: 83 package photos in `public/paquetes` (39 MB in git, largest 3.6 MB, `medellin-y-santa-marta/5.jpg`). They go through `next/image` (`src/lib/image-optimization.ts`, local paths optimizable), so delivered sizes are fine, but repo size and image transformations grow.

**Gaps.**
- **Every public page renders on each request.** The root layout reads the currency cookie (`src/app/layout.tsx:38`) and the locale comes from a middleware header (`src/middleware.ts:12`), so no page can be static or ISR-cached. Each view runs Supabase queries: package list, destination and **the full package table again for "related packages"** (`paquetes/[slug]/page.tsx:48`). On a slow connection this shows up as slow server response (TTFB) before any byte arrives.
- **Turnstile** loads a third-party script plus a `/api/human` round trip on every page with a form, and the submit button waits on it (§2 step 2).

**Actions.**
1. Cache the **data** layer with tags (Next 16 `use cache`/`cacheTag`; read `node_modules/next/dist/docs/` first, per `AGENTS.md`) and invalidate from the admin `save` action, which already calls `revalidatePath` (`src/app/admin/actions.ts:126-136`). Result: near-zero Supabase load per view.
2. Drop the currency cookie read from the layout while prices are hidden.
3. Pre-resize photos (max 2000 px, about 300 KB) before committing, or better, move them to Storage (§6).
4. Measure real Core Web Vitals in production (`docs/stage10.md` notes none were measured).

### 4.10 Security & privacy (forward-looking)

**Posture is good.** Fail-closed rate limits, Turnstile human session, body caps, RLS on the newer tables, OTP-gated portal, private buckets (`docs/security-fixes.md`, `SECURITY-AUDIT.md`).

**Gaps.**
- **D1** backup artifact in a public repo (critical).
- **D6** the portal session has no server-side expiry.
- **D7** the report-only CSP has no reporting endpoint, so it can never "graduate".
- **Passport retention:** portal documents (passports, up to 8 MB each) have no deletion rule. For a small operator, holding passport scans after the trip is pure liability.
- **The core schema isn't in the repo.** `leads`, `customers`, `quotations`, `reservations`, `payments`, `invoices` and the `hit_rate_limit` function exist only in the live database (`docs/sql/` holds only add-ons). RLS for future features can't be reviewed or reproduced.
- **Honduras data protection:** as far as I know there's no comprehensive personal-data statute in force (there is a constitutional *habeas data* right). *Verify with local counsel.* Good practice still applies: publish the approved privacy policy (legal pages are `noindex` pending approval, `src/app/legales/*/page.tsx:5`) and honour deletion requests.

**Actions.**
1. Fix D1 today.
2. Delete `portal-docs` objects 90 days after `fecha_fin` (a rule in the daily job).
3. Export the live schema (`pg_dump --schema-only`) into `docs/sql/schema.sql` and keep it current.
4. Add `report-to` to the CSP (a free endpoint such as Sentry's CSP reporting fits the existing Sentry setup).
5. Put the expiry inside the portal cookie signature.

### 4.11 Architecture & scalability (Supabase Free, solo operator)

| Volume | What holds | What breaks first |
|---|---|---|
| **10 leads/mo** | Everything | Nothing technical. The problem is lead volume, not capacity |
| **100 leads/mo** | DB (~5 KB/lead → a few MB/yr of the 500 MB free DB), Vercel, Supabase | **Resend free tier (100/day, 3,000/mo)** once automation sends acknowledgements, OTPs, quotes and reminders. The **advisor**: ~100 leads × ~30–45 min ≈ 60–75 h/mo of first-contact and quoting work |
| **1,000 leads/mo** | DB still fine | **Human capacity** (impossible for one advisor). **Supabase Storage 1 GB** if passports keep piling up at 8 MB each. Resend paid tier needed. Travel Buddy free quota. Per-IP rate limits for shared-IP mobile users |

**Other structural points.**
- **Content workflow:** the owner edits JSON in `data/`, drops photos into `public/`, runs `scripts/import-*.mjs` with the service-role key from a laptop, then commits and redeploys. That won't scale and it is risky (service key on a personal machine). The admin can't edit gallery, itinerary, no-incluye, categoría or etiquetas (`forms.tsx:46`). See §6.
- **Background jobs:** none exist. Use GitHub Actions cron (already in use) calling a secret-protected route, or Vercel Cron. Either is free.
- **The rate-limit table** grows with each IP/route key. Check that `hit_rate_limit` prunes old rows (it isn't in the repo).

### 4.12 Business functionality (admin CRM)

**Current state.** Clientes, cotizaciones (items, PDF, email), reservas (items, payments, balance), facturación (PDF, email), tickets, reviews/invitations, promo codes. That is a real back office for a solo agency.

**Gaps.**
- **Lead → quote isn't linked.** There is no `lead_id` and the quote isn't prefilled (`cotizaciones/actions.ts:37`), so duplicate customers pile up and conversion can't be counted.
- **No commission or cost field.** The owner sees gross totals but not what viatour earns. You can't manage what you can't see.
- **Reporting:** counts only.
- **"Factura" naming:** documents are titled "Factura" with `FAC-` numbers (`src/lib/invoice-pdf.tsx:41,47`, `reservas/actions.ts:129`). The owner's model is *receipts, not fiscal invoices*. In Honduras a document called *factura* normally requires SAR authorisation (CAI, authorised number range). See D8.
- **Retention/repeat:** no customer history view with past trips, no anniversary trigger, no referral tracking.
- **Upsell:** insurance and transfers are free-text line items. Nothing prompts the advisor to include them.

**Actions.**
- Add a `lead_id` FK and a "Crear cotización" button (Top-10 #3).
- Add `comision` on reservation items (Top-10 #9).
- Rename to *Recibo / Comprobante de pago* unless the owner confirms a CAI.
- Add a **default insurance line** in the quotation builder that the advisor removes if declined. Opt-out beats opt-in for attach rate, and it is honest because it stays itemised.
- Add a customer page timeline: leads, quotes, reservations, reviews.

### 4.13 Anything else

- **New revenue lines (all advisory-compatible):**
  - **Travel insurance on every quote.** Highest margin per minute of work.
  - **Grupos y viajes estudiantiles / graduaciones** as a productized offer (organizer kit, payment-plan schedule, per-traveler balance in the portal). Organizers bring 15–40 travelers per sale.
  - **Quinceañeras** (Cancún, Punta Cana, cruises, Disney/Orlando). A strong cultural niche OTAs don't serve.
  - **Corporate travel** for local SMEs (monthly account, receipts). This fits the admin you already have.
  - **Diaspora "reunión familiar"** trips (relatives in the US meeting family in a third country). Worth testing with the English UI.
- **Moat:** Honduras-specific knowledge (requirements, departure airports SAP/XPL/LCE/RTB, local holidays), a named real advisor, reviews since 2018, and owned content. Each page should say something only a Honduran advisor would know.
- **What would 10× qualified WhatsApp leads?** Not a single feature. It is **(a) every visitor's intent captured with identity** (#1), **(b) 30–50 genuine reviews on Google** (#5), **(c) 50 country-requirement pages plus 15 finished destination guides** targeting Honduran-origin queries (#7), and **(d) group organizers and quinceañera families**, each of whom brings 10–40 travelers (#6). The first three compound; the fourth multiplies revenue per lead.
- **Productizing the platform** for other Honduran agencies is possible later, but it's a distraction now.

---

## 5. Quick wins (each < 1 day)

- [ ] **D1:** stop publishing DB dumps. Encrypt before upload (`age`/`gpg` with a key stored in secrets) or make the repo private. Delete existing artifacts.
- [ ] **D2:** hero compact "Clase" is required but hidden (`flight-tool.tsx:36`). Default it to "Económica", or don't require it when collapsed. Repair the stale `tests/hero-smoke.mjs` so it would have caught this (it `.fill()`s a `<select>` and its failure case is satisfied by the validation alert).
- [ ] **D3:** align discovery keys (`assistant.tsx:18-21` vs `discovery-data.ts:3-6, 57-65, 71, 92`) and add a unit test for every option.
- [ ] **D4:** "Compartir por WhatsApp" → `wa.me/<cliente_telefono digits>` (`cotizaciones/actions.ts:94-95`, `reservas/actions.ts:174-175`).
- [ ] **Ref code** in every prefilled message (`quote.ts`).
- [ ] **Fail open:** on capture error, show a WhatsApp link with the full composed message (`quote.ts:33`, `quote-button.tsx:24`).
- [ ] **Readable lead email** with labelled lines and an admin deep link (`notifications.ts:25-35`).
- [ ] **Leads filter by estado** in admin (`lib/admin.ts:24`), mirroring the reviews filter.
- [ ] **UTM/referrer capture** into `payload` (no schema change needed).
- [ ] **Package-page share button** (WhatsApp share URL).
- [ ] **Make "Fechas" optional** on the package form with a month hint.
- [ ] **Hide the empty reviews teaser** until the first approved review; move *Por qué viatour* up.
- [ ] **Import genuine Facebook reviews** (`scripts/import-reviews.ts --dry-run` first). Owner time only.
- [ ] **Rename the Google Business Profile** to "viatour" and send the review link to 20 recent past customers (by hand in WhatsApp).
- [ ] **Cache requirement results** 30 days (`travelbuddy.ts:123`).
- [ ] **Add an advisor CTA** under requirement results and on city pages.
- [ ] **Noindex `/en` database pages** and drop them from the sitemap until translated.
- [ ] **Add CSP `report-to`** so report-only produces data.
- [ ] **Rename "Factura" → "Recibo"** unless a SAR CAI exists (owner confirms).

---

## 6. Bigger bets (multi-week)

1. **Lead pipeline + daily automation engine (2–3 weeks).** Top-10 #3 + #4 together. *Case:* it is the difference between an advisor who remembers and a business that follows up. Expected: 5–8 advisor hours/week saved, measurable conversion lift from follow-ups, a steady flow of reviews. Cost: free tiers, with Resend paid (~US$20/mo) once past 100 emails/day.
2. **In-admin content & media management (2 weeks).** Upload package and destination photos to Supabase Storage (reuse `src/app/api/admin/blog-images/route.ts`). Edit gallery, itinerary, inclusions, exclusions, categoría and etiquetas in `forms.tsx`. Duplicate a package. Retire the laptop → JSON → import → redeploy loop. *Case:* the owner can publish a seasonal package in 20 minutes from a phone, with no service key on a laptop. Storage: ~300 optimised photos fit comfortably in the 1 GB free tier.
3. **Segment offers + group engine (2–3 weeks).** Pages and intake for grupos/estudiantiles, quinceañeras, lunas de miel and familias. Group reservations get per-traveler balances in the portal (`reservations` + payments per traveler). *Case:* groups carry the best revenue per advisor hour (§7).
4. **Review engine at scale (1 week after #1).** Automatic T+3 invitations; bulk CSV invitations for past customers; a "Déjenos su opinión en Google" step after an on-site review. *Case:* proof is the conversion multiplier for a hidden-price model.
5. **Requirements SEO hub (2 weeks).** Cached data, 50 country pages written for Honduran passport holders, each with an advisor CTA and a link to related packages.
6. **WhatsApp Business Platform (Cloud API), later, at ~150+ leads/month.** *Case for:* template messages for reminders delivered on WhatsApp instead of email; an inbound webhook that reads the `Ref. L-XXXX` and automatically marks the lead "en conversación". That closes the attribution loop with zero manual work. *Cost/risk:* per-conversation fees under Meta's pricing, business verification, and template approval. Meta supports running the Business app and the Cloud API on the same number ("coexistence") in many markets; verify it for +504 before planning. Not worth it before #1–#4.

---

## 7. Revenue model analysis

> **All figures below are planning assumptions** based on typical agency economics, not viatour data. Replace them with the host agency's real commission schedule, its split, and the owner's actual ticket fee.

**How a WhatsApp-advisory agency earns:**
- supplier commission on packages, hotels, cruises and tours (wholesaler/operator pays; the host agency takes its split);
- a service fee on air tickets (airline commissions are near zero);
- commission on travel insurance and transfers;
- occasionally a group "free spot" or override from operators.

| Segment | Assumed booking value (USD) | Assumed gross margin | Net to viatour at an assumed 70% host split | Assumed advisor hours to close |
|---|---|---|---|---|
| Flight only | 600–1,200 | service fee 25–40 | 25–40 (fee usually kept 100%) | 1–1.5 |
| Hotel only | 500–1,500 | 10–15% | 35–160 | 1 |
| Package, couple (Caribe/Cartagena) | 1,800–3,000 | 10–12% | 125–250 | 2–3 |
| Family (4 pax), Caribe/Orlando | 4,000–7,000 | ~10% | 280–490 | 3–4 |
| Honeymoon / Europe / Dubái | 5,000–9,000 | ~10% | 350–630 | 4–6 |
| Cruise, couple | 1,500–4,000 | 10–16% | 105–450 | 2 |
| Quinceañera (8–20 relatives) | 10,000–30,000 | ~10% | 700–2,100 | 8–15 |
| Group / estudiantil (15–40 pax) | 20,000–60,000 | 8–12% | 1,100–5,000 | 15–30 |
| Travel insurance (per traveler) | 40–150 | 20–40% | 10–40 | ~0.1 |

**Illustrative 12-month base case** (100 bookings, about a 15% close rate on ~650 leads):

| Mix | Bookings | Net (midpoint) | Share | Advisor hours |
|---|---|---|---|---|
| Flights | 20 | ~$640 | 2% | 25 |
| Hotels | 10 | ~$880 | 3% | 10 |
| Couple packages | 35 | ~$6,650 | 23% | 88 |
| Families | 12 | ~$4,620 | 16% | 42 |
| Long-haul / honeymoon | 8 | ~$3,920 | 13% | 40 |
| Cruises | 6 | ~$1,680 | 6% | 12 |
| Groups | 2 | ~$6,000 | 21% | 44 |
| Quinceañeras | 2 | ~$2,800 | 10% | 24 |
| Insurance attach (80 travelers) | — | ~$2,000 | 7% | 8 |
| **Total** | **100** | **≈ $29,000** | | **≈ 290 h closing + ≈ 290 h on leads that don't book ≈ 11 h/week** |

**What the model says:**
- **4 group/quinceañera bookings ≈ 31% of net; 20 flight bookings ≈ 2%.** Effective net per advisor hour is roughly $50 overall and roughly $15–25 on flight-only work.
- **Time spent on leads that never book equals time spent closing.** Qualification (4.2), follow-ups (4.6) and faster quotes (item library, templates) are the biggest profit lever. They are more important than more traffic.
- **Insurance attach is almost free money:** about 7% of net for about 1% of the hours. Make it a default quote line.

**Levers (ranked):**
1. Shift the mix toward groups, quinceañeras, families and long-haul (segment pages, lead score, advisor priority).
2. Raise the close rate from ~15% toward 25% (identity + follow-ups + reviews). At constant traffic that is roughly **+65% net**.
3. Cut time-to-quote (templates, item library, lead → quote prefill): 30–45 minutes saved per quote.
4. Attach insurance and transfers by default.
5. Charge a transparent service fee on flight-only requests (owner decision), or answer them through a faster templated path.

---

## 8. Constraint-change decisions (owner decisions, not code tasks)

**D-1 · Hidden prices.**
- *For showing "desde" reference prices:* on a quote-first site, price is the #1 qualifier. A visible "desde US$1,450 por persona (referencial)" filters out people who can't afford the trip before they use advisor time, and it earns more clicks from search results. Everything is already built: `PACKAGE_DISPLAY_RULES.mostrar_precios` (`src/lib/packages.ts:13-16`), `hasPublishedPrice`, and `precio_desde` in admin. JSON-LD would then correctly emit `Offer`.
- *Against:* prices go stale with airfare and FX, which can look like bait. Competitors can see your pricing.
- *Recommendation:* show real, dated "desde" prices **only on the 5–8 best-selling packages**, labelled "referencial, actualizado {mes}", with owner-supplied figures from real recent quotes. Keep the rest on "Solicitar cotización".

**D-2 · Hidden dates.** Fixed-date **group departures** (Semana Santa 2027 falls in late March; Semana Morazánica early October; December) are how Honduran agencies sell groups. *Recommendation:* allow dates **only** on real, operator-confirmed group departures, labelled "sujeto a cupo". Keep dates hidden everywhere else.

**D-3 · No online payment.** Keep the advisory model. *Consider:* a **payment link** (issued by the host agency's or bank's processor) that the advisor sends for a deposit, recorded in `payments` as today. That is still advisor-driven, not checkout. It removes the "transfer to a stranger" objection and speeds up closes. Chargeback and fee costs apply. The owner decides once a processor is available.

**D-4 · Single advisor.** This is the hard ceiling (§4.11, §7). *Recommendation:* at a sustained ~80–100 leads/month, add a **part-time, commission-based second advisor**. The admin already records `agente_id` on quotations and reservations (`cotizaciones/actions.ts:42`), so splitting work and reporting per advisor is a small step.

**D-5 · No AI.** Kept. Nothing in this audit needs it. Every automation proposed is a fixed rule over existing dates and states.

**D-6 · "Capture first, then WhatsApp" vs. "never dead-end".** `AGENTS.md` requires capturing before opening WhatsApp. The code now **blocks** WhatsApp when capture fails (`quote.ts:33`). *Recommendation:* capture first (keep it) but **fall back** to WhatsApp on failure. The customer's message itself carries the full request, so the rule's purpose (no lost lead) is better served than by a dead end. The owner must approve because it relaxes the literal rule.

---

## 9. New defects found (appendix)

| ID | Sev. | Defect | Evidence | Fix |
|---|---|---|---|---|
| **D1** | **Critical** | **Public repo + daily unencrypted `pg_dump` uploaded as a GitHub Actions artifact.** Public-repo artifacts are downloadable by signed-in GitHub users, which exposes leads, customers, payments and invoices once `SUPABASE_DB_URL` is set | Repo `0120palacios-cmd/viatour` is `private: false`; `.github/workflows/backup.yml:23-35` | Encrypt before upload or store in a private bucket; or make the repo private. Delete existing artifacts. Rotate the DB password if any run happened |
| **D2** | **High** | **Hero form can't submit on its default Vuelos tab when collapsed.** The required `<select name="class">` sits inside a `hidden` (display:none) wrapper; browser validation blocks the submit and nothing visible shows why | `src/components/home/flight-tool.tsx:36` (`compact ? "hidden"` around the `required` class field); hero uses `compact` (`sections.tsx:34`) | Default "Económica" or drop `required` when compact. *Confirm in a real browser; the logic follows HTML constraint-validation rules* |
| **D3** | **High** | **Discovery crashes** when "Gastronomía" is selected (`interestTags["gastronomia"]` is undefined → `.some` throws). "Económico" budget and "Cálido" climate **never score** (accent mismatch) | UI keys `assistant.tsx:18-21` vs `discovery-data.ts:57-65,71,92`. **Reproduced** by running `scoreDestinations` with the UI keys: `TypeError: Cannot read properties of undefined (reading 'some')` | Normalise keys in one place + a test over every option |
| **D4** | Medium | "Compartir por WhatsApp" after sending a quote or invoice opens a chat with **viatour's own number** | `cotizaciones/actions.ts:94-95`, `reservas/actions.ts:174-175` | Use the customer's phone |
| **D5** | Medium (verify) | Portal login matches `reservations.cliente_apellido`, but **no code in the repo writes that column** (reservation insert `reservas/actions.ts:62-68`). Unless the live DB has a generated column, customers can never get in | `src/app/mi-reserva/actions.ts:82`; no `cliente_apellido` in `docs/sql/` | Check the live schema; if missing, add a generated column or an admin field |
| **D6** | Medium | The portal session cookie signs only the reservation id and has **no server-side expiry**; a copied cookie stays valid until `PORTAL_SECRET` rotates | `src/lib/portal.ts:19-44`; Max-Age only in the browser (`mi-reserva/actions.ts:163`) | Sign `id.expiresAt` like the pending cookie (`portal.ts:46-64`) |
| **D7** | Medium | The report-only CSP has **no `report-uri`/`report-to`**, so no reports are ever collected and the documented "enforce after zero reports" step can't happen | `next.config.ts:6-22,28`; `docs/pre-launch-checklist.md:394` | Add a reporting endpoint |
| **D8** | Medium (compliance) | Documents are issued as **"Factura" / `FAC-…`** while the model is receipts, not fiscal invoices. That could conflict with SAR invoicing rules | `src/lib/invoice-pdf.tsx:41,47`; `reservas/actions.ts:129`; `admin/facturacion/*` | Rename to *Recibo* unless a CAI is in place; confirm with an accountant |
| **D9** | Low | FinalCta's quote button submits `fields: {}`, creating empty leads with no destination, dates or contact | `src/components/home/sections.tsx:55`; accepted by `lead-validation.ts:22` | Link to the full form instead |
| **D10** | Low | Travel Buddy is called uncached (`no-store`) on every check, so the free quota burns fast; the fallback covers only 4 countries | `src/lib/requirements/travelbuddy.ts:123`; `offline-data.json` (4 entries) | Cache results in the DB |
| **D11** | Low | English visitors' quote messages keep Spanish labels for all services except "Paquete" | `src/lib/quote.ts:8-14` | Extend the label map |

---

## 10. What to investigate next

1. **Real funnel numbers (1 hour with the database):** leads per month by `servicio`; the share with a name; how many WhatsApp chats per month arrive *without* a site lead (the direct-WhatsApp share); quotes sent vs. accepted. These replace the §7 assumptions.
2. **Host agency terms:** the actual commission schedule by product, the split, the ticket-fee policy, and termination clauses. How exposed is the business to that one contract?
3. **Live DB schema export:** confirm `cliente_apellido` (D5), `hit_rate_limit` pruning, and RLS on core tables. Commit `schema.sql`.
4. **Hosting and email plans:** is Vercel on Hobby (commercial-use terms)? Is the Resend free cap enough once automation runs?
5. **Brand search:** what shows for "viatour", "viatour honduras" and "miviatour" on Google and in Maps? Does Viator appear first? Rename the GBP accordingly.
6. **Fiscal status:** can viatour issue SAR-authorised *facturas* (CAI), or should every document be a *recibo*? (D8)
7. **Review backlog:** how many genuine Facebook recommendations and WhatsApp testimonials exist with permission to publish?
8. **Segment demand:** of the last 50 closed trips, how many were groups, quinceañeras, honeymoons or families? That decides which segment page to build first.
9. **Real-device test:** submit every form on a mid-range Android over throttled 3G. Time to an enabled button (Turnstile), and whether D2 reproduces.
10. **Seasonal calendar:** the December and Semana Santa 2027 campaigns need pages and real group departures live by **late October** and **January** respectively.

*sueña, descubre, sonríe.*
