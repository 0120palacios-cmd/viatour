# viatour — Opportunity & Viability Audit

Date: 2026-09-29 · Branch audited: `mobile-and-audit` (working tree, including uncommitted changes) · Scope: growth, revenue, autonomy and viability. Read-only: no code, data or configuration was changed. The only file written is this one.

Every claim below is tied to a file and line, a doc section, or the content inventory in `data/`. Line numbers refer to the working tree on this date. **Where a number is an assumption and not a fact, it is labeled "(assumption)"; replace it with your real figures before making decisions from it.**

---

## 1. Executive summary

**Verdict: viable, but the funnel currently loses leads by design.** A WhatsApp-advisory outbound agency that hides prices is a sound model for Honduras, where buyers are relationship-driven, WhatsApp-native and cautious about paying online. The platform is well built: the security layer, the admin CRM (quote → reservation → payment → receipt PDF), the customer portal, review invitations and 34 packages with itineraries are more than most local agencies have. The model will not fail because of the product. It will stall for three reasons: leads that cannot be contacted, one advisor with no automation, and zero public proof.

**The single biggest bottleneck: most leads can't be contacted.** The hero quote tool, the package quote form and the discovery assistant do not ask for a phone number or an email address:
- The hero form's name field is optional and hidden in compact mode (`src/components/home/flight-tool.tsx:36`).
- The package form has no name field at all (`src/components/packages/package-quote.tsx:37`).
- Discovery sends no contact data (`src/components/discovery/assistant.tsx:49-50`).

The lead is saved and then `window.location.assign` sends the visitor to `wa.me` (`src/lib/quote.ts:32-38`). If they don't press send, and many won't (desktop users without WhatsApp Desktop, people who get distracted, people who don't want to message a stranger first), the database holds an anonymous travel wish that nobody can follow up. The Design Bible rule "capture first, so no lead is lost if the customer doesn't press send" (`bible_desing.md` §11) is followed in its sequence but not in its purpose. There is also no reference code in the WhatsApp message (`src/lib/quote.ts:12-14`), so the advisor can't match a chat to its database lead. As a result you can't measure how many leads you lose, and you can't compute conversion.

**The 3 highest-leverage moves:**

1. **Make every lead contactable and traceable (S, about a day).** Add a required WhatsApp number (with optional email) to every quote form. Put a short reference (`Ref: VT-4F2A`) in the prefilled message. Replace the blind redirect with a confirmation state ("Recibimos su solicitud, referencia VT-4F2A") and an "Abrir WhatsApp" button. The contact form already does this (`src/components/contact-form.tsx:14-15`). This turns every lead that doesn't press send from a total loss into a lead the advisor can call back.
2. **Turn Leads into a working inbox (S–M).** Add a status filter, a "Escribir al cliente por WhatsApp" button (`wa.me/<customer phone>`, no API needed) and "Crear cotización desde este lead" with prefilled fields. Add `lead_id` on quotations so lead → quote → booking conversion can be measured. Today the lead list is an unfiltered dump of raw rows (`src/app/admin/(protected)/[section]/page.tsx:37-39`, `src/lib/admin.ts:21-29`).
3. **A daily deterministic digest plus automatic review requests (M).** One scheduled job emails the owner every morning:
   - uncontacted leads
   - quotes past their `validez`
   - balances owed
   - trips leaving in the next 7 or 30 days
   - trips that finished with no review invitation sent

   The same job sends review invitations automatically when a reservation completes, reusing the existing invitation system (`src/app/admin/opiniones/actions.ts:33`). This replaces the advisor's memory as the pipeline and starts building the review base that currently stands at zero.

---

## 2. The lead-to-booking path

Each step lists who does the work today, whether it leaks, and the fix. Steps are ordered by where they occur, and leaks are marked by severity.

| # | Step | Today | Leak | Fix (by leverage) |
|---|---|---|---|---|
| 1 | **Visit** | Organic, social and direct. Pages render dynamically on every request (`src/app/layout.tsx:38` reads a cookie; locale comes from headers). | Low–med: speed on 3G/4G (see §4.9). | Cache content reads (see §4.9). |
| 2 | **Browse** | 34 packages (all without price: `data/packages.json`, `precio_desde` null in all 34), 11 of 40 destinations published (`data/destinations.json`), 9 blog posts. | Med: many packages point to unpublished destinations. City pages and requirements results have **no quote CTA** (`src/app/agencia-de-viajes/[city]/page.tsx:41-55`; `src/components/requirements/requirements-checker.tsx:52-56`). | Add a quote CTA to city pages and requirement results. Publish destinations that already have packages. |
| 3 | **Decide to ask** | Hero tool, package form, destination QuoteButton, discovery, contact. The submit button stays disabled until Turnstile resolves and gives no explanation (`flight-tool.tsx:36`, `package-quote.tsx:62`, `turnstile.tsx:14-16`). | Med: on a slow connection the button looks broken. On mobile the package form sits at the bottom of a long page (`src/app/paquetes/[slug]/page.tsx:55-67`: the `aside` comes after all the content). | Label the verifying state ("Verificando…"). Add a sticky mobile "Solicitar cotización" bar that links to `#solicitar-cotizacion`. |
| 4 | **Lead captured** | `/api/leads` validates, rate-limits, inserts and emails a raw JSON dump to soporte (`src/app/api/leads/route.ts:13-19`, `src/lib/notifications.ts:25-34`). | **HIGH: no phone or email is captured** outside `/contacto` (`src/lib/lead-validation.ts:22-37, 50`). No page, referrer or UTM is captured, so there's no attribution. | Required WhatsApp number, optional email, reference code, source fields. |
| 5 | **WhatsApp handoff** | Same-tab redirect to `wa.me/50488668704` with a labeled message (`src/lib/quote.ts:37`). | **HIGH: the largest drop.** Desktop users land on WhatsApp Web's login screen and leave the site. Anyone who doesn't press send is lost, and today can't be recovered. | Confirmation screen plus an "Abrir WhatsApp" button (the visitor keeps a page and a reference). Advisor callback using the captured number. |
| 6 | **Advisor replies** | Manually in the WhatsApp app. The general header, floating and footer buttons send a generic "Hola, me gustaría recibir asesoría" with no context (`src/lib/navigation.ts:31-34`). | Med: the advisor starts every chat from zero and has to ask again what the lead already typed. | A reference code in the message, then find the lead in admin by reference. Use WhatsApp Business app labels and quick replies that mirror lead states (free, no code). |
| 7 | **Quote** | Admin quotation builder, PDF and email (`src/app/admin/cotizaciones/actions.ts:28-96`). The quote isn't linked to a lead. **"Compartir por WhatsApp" opens a chat with your own number**, not the customer's (`cotizaciones/actions.ts:94-95`). | Med: retyping lead data, no follow-up on quotes marked `enviada`, a broken share button. | "Crear cotización desde lead". Fix the share link to use `cliente_telefono`. Digest line for "sent, no answer after N days". |
| 8 | **Booking** | Accepted quote → reservation → payments → "Factura" PDF (`src/app/admin/reservas/actions.ts:53-176`). | Low leak, high manual time. Nothing happens automatically when a trip nears or ends. | Reminders (balance due, documents, trip in 7 days with a `/requisitos` link). |
| 9 | **After the trip** | Review invitation is sent manually (`src/app/admin/opiniones/actions.ts:33`). Gira codes are issued manually. | Med: no reviews, no referrals, no repeat-trip prompts. | Automatic invitation when a reservation completes. Referral code. Anniversary and season reminders to past customers. |

**Where leads are lost, ranked:** (1) step 5, the handoff, made unrecoverable by (2) step 4, no contact captured. Then (3) step 3, friction from the disabled button and the form's position on mobile. Then (4) step 7, sent quotes with no follow-up.

---

## 3. Top 10 opportunities, ranked

Ranked by leverage for one person with limited time. Effort: S = under a day, M = 2–5 days, L = 1–3 weeks.

### 1. Contactable, traceable leads
- **What:** Add a required "Número de WhatsApp" field (`+504` default, plus international), an optional email and optional name on the hero, package and discovery forms. Generate a short reference server-side (`VT-` plus 4–5 characters), return it from `/api/leads`, and append `Referencia: VT-XXXX` to the WhatsApp message.
- **Why:** It turns lost leads into leads you can call back, and it makes the capture-first rule do its job. The reference lets the advisor match chats to leads, so you can finally measure what share of leads actually send the WhatsApp message.
- **Where it hooks in:** `src/lib/lead-validation.ts:50` and `:22-37` (add a `telefono` validator next to the existing `count`/`date` helpers); `src/app/api/leads/route.ts:13` (add `telefono`, `email` and `referencia` columns; `labels.telefono` already exists in the admin at `[section]/page.tsx:16`); `src/lib/quote.ts:12-14` and `:26-29` (read the returned id or reference). Schema: `alter table leads add column telefono text, add column email text, add column referencia text unique` in `docs/sql/`. Update `tests/leads.test.mjs`.
- **Effort / impact:** S. Leads recovered: likely the largest single gain on the site (the exact size is unknown until you measure it, which this change also enables).
- **First build step:** add `telefono` (required, 8–20 digits after normalization) to the `Vuelos/Hoteles/Paquetes/Viaje a medida` branch of `validateLead` and to the package and discovery branches, with tests.

### 2. Confirmation state instead of a blind redirect
- **What:** After saving, show "Recibimos su solicitud. Referencia VT-XXXX." with a primary "Continuar en WhatsApp" button and the note "Si no le es posible escribirnos ahora, lo contactaremos al número que nos indicó." That note makes no response-time claim.
- **Why:** Desktop and WhatsApp-Web users keep the page. The visitor keeps a reference. The `whatsapp_click` event becomes a real click instead of firing before navigation (`quote.ts:34-35`), so GA4 can show the drop between saved and clicked.
- **Where it hooks in:** `src/lib/quote.ts:32-38` (split into `captureLead` plus `buildWhatsAppHref`); the pattern already exists in `src/components/contact-form.tsx:14-15`.
- **Effort / impact:** S. Conversion and measurement.
- **First build step:** make `requestQuote` return `{ reference, href }` and render the contact-form success panel in `QuoteForm` and `PackageQuote`.

### 3. A Leads inbox the advisor can work from
- **What:**
  - Filter by estado and servicio, and search by reference.
  - A compact row: age, servicio, destino, pasajeros, phone.
  - A "Escribir al cliente" button (`https://wa.me/<phone>?text=Hola <nombre>, le escribe su asesor de viatour sobre su solicitud VT-XXXX…`).
  - "Crear cotización" prefilled from the lead.
  - `lead_id` on `quotations`.
  - Split `cerrado` into `ganado` / `perdido` with a loss reason (precio, fechas, sin respuesta, compró en otro lugar).
- **Why:** Today the advisor reads a dump of every column, including `user_agent` (`[section]/page.tsx:38`), with no filter (`src/lib/admin.ts:24-25` filters only reviews and blog). Lead → quote → booking conversion can't be computed without the link.
- **Where it hooks in:** `src/lib/admin.ts:21-29`; `src/app/admin/(protected)/[section]/page.tsx:37-58`; `src/app/admin/actions.ts:68-74` (states); `src/app/admin/cotizaciones/actions.ts:42` (`lead_id`); `src/lib/quotation-types.ts:16-32`.
- **Effort / impact:** M. Time saved: a few minutes per lead. Also makes the conversion numbers possible.
- **First build step:** add `estado` filtering for `leads` in `adminPage` and a "Escribir al cliente" link in `LeadRecord`.

### 4. Daily owner digest plus automatic reminders (deterministic)
- **What:** A protected route called once a day by a scheduler: GitHub Actions `schedule` (already used in `.github/workflows/backup.yml:5-6`) or Vercel Cron. It emails the owner one plain-text digest:
  - leads `nuevo` older than 24 h
  - quotes `enviada` more than 3 days without a change, and quotes past `validez`
  - reservations with a balance due (total minus sum of payments)
  - trips starting in 7 or 30 days
  - completed trips with no review invitation

  It also sets overdue quotes to `expirada` and sends customers rule-based emails: balance reminder, "su viaje es en 7 días" with a `/requisitos` link, and the review invitation. All sends go through the existing `sendResendEmail` with idempotency keys (`src/lib/notifications.ts:14-23`).
- **Why:** It replaces the advisor's memory as the pipeline. Nothing slips when you are busy, which is exactly when leads arrive.
- **Where it hooks in:** new `src/app/api/cron/daily/route.ts` (bearer secret, service role, `server-only`); data from `quotations`, `reservations`, `payments`, `review_invitations`.
- **Effort / impact:** M. Time saved: plausibly 2–4 h per week once there are 20 or more open files (assumption). Revenue: fewer quotes forgotten.
- **First build step:** the owner digest only (read-only queries plus one email); customer emails next.

### 5. A review engine: real proof, quickly and ethically
- **What:**
  - (a) Owner work, no code: import genuine Facebook reviews and WhatsApp-screenshot reviews with real names and original dates through the existing `scripts/import-reviews.ts` and `data/reviews-import.sample.csv`, exactly as `build_brief.md` §2 already plans.
  - (b) Automatic invitation when a reservation reaches `completada` (from #4).
  - (c) Every invitation email and the portal also link to the Google review form (`siteConfig.googleReviewUrl`, `src/lib/site-config.ts:8`).
  - (d) Show the Google rating and count on the site only if you enter them manually and date them. No scraping, no invented numbers.
- **Why:** The site shows zero reviews. Google reviews on the Business Profile drive local ranking and are what Hondurans check. Stars from site reviews won't appear in Google results anyway: the `AggregateRating` on your own `TravelAgency` (`src/lib/reviews.ts:40-42`) is "self-serving" markup, which Google excludes from rich results.
- **Effort / impact:** S for the import (owner time). S–M for automation. Conversion and local SEO.
- **First build step:** export 20–50 real Facebook recommendations and run the import script with `--dry-run`.

### 6. Attribution on every lead
- **What:** Send `page` (pathname), `referrer` host and first-touch `utm_source/medium/campaign` (kept in `sessionStorage`) with each lead. Allowlist them server-side and show them in admin. Add a dashboard panel: leads by source, servicio and destino over the last 30 days.
- **Why:** Before any money goes to Meta ads or content, you need to know which pages and channels produce leads that book. Today the payload carries only service fields (`src/lib/quote.ts:4`).
- **Where it hooks in:** `src/lib/quote.ts:17-29`; `src/lib/lead-validation.ts:9` (collection caps); `src/app/admin/(protected)/page.tsx:7` (counts only today).
- **Effort / impact:** S. Revenue indirectly (spend where it works).
- **First build step:** add `origen_pagina` and `utm` to the payload and the `leads` row.

### 7. SEO that fits a solo owner
- **What:**
  - (a) Stop publishing English detail URLs whose body is Spanish (see §4.5).
  - (b) Publish the draft destinations that already have packages and real copy.
  - (c) Add a quote CTA and matching packages to city pages and requirement results.
  - (d) Build hand-reviewed "Requisitos para viajar a [país] desde Honduras" pages for the top 10 countries, hubbed on `/requisitos`.
- **Why:** Requirements queries are the highest-intent informational searches that Honduran travelers make and that OTAs don't answer for Hondurans specifically. You already own the data layer (`src/lib/requirements/`) and a blog post (`requisitos-para-viajar-desde-honduras`).
- **Effort / impact:** S for (a–c), M for (d). Leads over 3–9 months.
- **First build step:** filter DB-backed detail pages out of the EN sitemap (`src/app/sitemap.ts:11-12`).

### 8. Productize the high-ticket segments
- **What:** Dedicated landing pages with a short qualifying form for Quinceañeras (the `quinceaneras-por-europa` package exists), Lunas de miel (`punta-cana-luna-de-miel`, `maldivas-luna-de-miel`), Grupos / estudiantiles / familias grandes, and optionally Viajes corporativos. Suggested form fields:
  - fecha del evento
  - número de viajeros
  - rango de presupuesto (bands, not a price)
  - quién decide / quién paga
- **Why:** These segments carry larger ticket sizes and more travelers per closing conversation, so advisor time per dollar of commission falls. A group of 15 takes more work than a couple, but not 7× more.
- **Where it hooks in:** new routes reusing `QuoteButton` / `FlightTool` patterns. Add a `segmento` enum to leads.
- **Effort / impact:** M. Revenue per lead.
- **First build step:** one `/quinceaneras` page with a `segmento: "quinceañera"` lead type. Copy must be drafted and approved by you (`AGENTS.md`).

### 9. Know your real income
- **What:** Add an admin-only `comision` (or `ingreso_neto`) field on reservations and payments, a `segmento` field, and a monthly report of bookings, gross, net commission, and average net per booking by servicio and segment.
- **Why:** `reservations.total` is what the customer pays, not what you earn (`src/lib/reservation-types.ts:12-30`). Without net income per booking you can't tell whether flight-only leads are worth the time (see §7).
- **Effort / impact:** S–M. Supports pricing and triage decisions.
- **First build step:** a nullable numeric `comision` column, a field on the reservation form, and a sum on the dashboard.

### 10. Turn "gira" and referrals into acquisition
- **What:** Today the customer shares their video privately on WhatsApp (`src/app/gira/page.tsx:13,17,19`), so no new person sees it. Change the mechanic:
  1. The customer posts publicly on TikTok, Instagram or Facebook, tagging @miviatour.
  2. They submit the post URL.
  3. The advisor approves it.
  4. The spin code is issued.

  Add a "Recomiende a un amigo" code: when a referred customer books, the referrer receives a spin code. This reuses `promo_spins` and adds a `referido_por` column.
- **Why:** Your best ads are real customers' travel videos, and the terms already authorize republishing (`gira/page.tsx:16`). Referrals are the main acquisition and repeat channel for relationship-based agencies.
- **Effort / impact:** S–M. Leads (organic, social).
- **First build step:** rewrite the steps and CTA copy (for your approval) to ask for a public post and its link.

---

## 4. Findings by area

### 4.1 Overall viability
- **Current state:** Advisory, WhatsApp-based, prices and dates hidden (`src/lib/packages.ts:13-16`), payments recorded by staff (`src/lib/reservation-types.ts:6`). There are 34 packages across Caribe, Suramérica, Europa, Medio Oriente, Asia, África, Norteamérica, Centroamérica and Cruceros (`data/packages.json`), and 2018 roots on Facebook and WhatsApp (`build_brief.md` §4).
- **Is the model sound?** Yes, for Honduras. The customer buys trust and hand-holding (documents, visas, payment plans) as much as the trip itself. The model competes with OTAs on advice, not price. Its weakness is linear labor: every sale costs advisor hours, and nothing scales with traffic except leads waiting.
- **Existential risks:**
  1. **Single-advisor bottleneck.** Capacity caps revenue before demand does (§7).
  2. **Host-agency dependence.** Commission splits, ticketing access and the IATA claim ("IATA sales under an accredited host agency", `messages/es.json:57`) depend on one contract. Keep a written agreement and a second supplier for packages.
  3. **Seasonality.** Demand peaks around Semana Santa, the Semana Morazánica (early October, so it is now), and Diciembre / fin de año. Cash flow and advisor load swing with them.
  4. **Brand confusion with "Viator"** (TripAdvisor's tours brand). Searches for "viatour" may be autocorrected or served Viator results, and the Google Business Profile is named "Viatour Travel" (`src/lib/site-config.ts:9`), which differs from the lowercase brand. Own "miviatour" as the branded term everywhere (handle, GBP short name, printed materials).
  5. **Zero reviews** (§4.3).
- **Recommended actions:** remove the funnel leak (Top 10 #1–3), then add capacity (a second, commission-based associate advisor) before paid acquisition scales.

### 4.2 Lead generation & qualification (top priority)
- **Current state:** Five capture points, all capture-first (`src/lib/quote.ts:32-38`). Server validation is strict and allowlisted per service (`src/lib/lead-validation.ts`). The notification email is a raw JSON dump (`src/lib/notifications.ts:32`).
- **Gaps:**
  - **No contact data** on four of five forms (§1).
  - **No reference** linking a lead to its chat.
  - **Qualification is weak for packages:** "Fechas" is free text and there is no budget band. Only "Viaje a medida" asks a budget (`lead-validation.ts:71`).
  - **Discovery** gathers seven qualifying answers (`assistant.tsx:49-50`), which is excellent for qualification, but then drops the visitor into WhatsApp without contact data.
  - **Direct WhatsApp buttons** (header, floating, footer, blog) bypass capture and send a context-free greeting (`src/lib/navigation.ts:31-34`, `src/components/layout/whatsapp-link.tsx:13`).
  - **The notification email** is hard to read on a phone.
- **Opportunities:**
  - Contact field plus reference (Top 10 #1).
  - Pass the current page into the generic WhatsApp message ("Hola, vi el paquete *Cartagena all inclusive* en su sitio…") by giving `whatsappHref` an optional context; the float can read the page title. This is not captured, but it gives the advisor context for free.
  - Rewrite the notification email as labeled lines in the same order as the WhatsApp message, with the phone as a `wa.me` link and a link to the admin record.
  - Add a "Presupuesto aproximado por persona" band (económico / medio / alto, as in discovery) to the package form.
  - **Abandoned-lead follow-up:** once a phone number exists, the digest lists "leads without a chat after 2 h" and the advisor taps "Escribir al cliente". An email follow-up can be automatic when an email was given.
- **Recommended actions:** Top 10 #1, #2, #3, then the email rewrite (S).

### 4.3 Conversion rate optimization
- **Current state:** Every price shows "Solicitar cotización" (`src/components/packages/package-price.tsx:3`). Both branches of that component return the same text, so the flag is currently a no-op on display. There is a "Cómo funciona" section on home (`messages/es.json:86-92`) and a "why" block that includes "Experiencia desde 2018" (`messages/es.json:115-116`). Reviews show an empty state (`src/components/home/sections.tsx:43`).
- **Gaps:**
  - Submit is disabled with no label while Turnstile verifies.
  - The package form is at the bottom on mobile.
  - "Solicitar cotización" doesn't tell the visitor what they get or what it costs them. The value of advice needs one line near every CTA.
  - There is no honest urgency: packages have no seasonal framing ("Temporada alta: Semana Santa 2027 (21–28 de marzo)" is a true, verifiable date that justifies planning now).
  - Zero reviews and no Google rating are visible.
- **Opportunities:**
  - A one-line value statement under every quote CTA, drafted for your approval. For example: "Cotización personalizada sin costo ni compromiso. Un asesor le explica qué incluye y confirma el precio final con usted."
  - A sticky mobile CTA bar on package and destination pages.
  - A "Verificando…" state.
  - A seasonal band on packages and home driven by a simple date table (no invented scarcity, only calendar facts).
  - The review import and Google link (Top 10 #5).
- **Recommended actions:** the quick wins in §5, then Top 10 #5.

### 4.4 Customer acquisition (product-driven)
- **Current state:**
  - Local SEO city pages: 4 published, 11 set to `noindex` (`src/lib/city-seo.ts:43`; `docs/pre-launch-checklist.md` §Indexación).
  - Blog: 9 posts, all published (`data/blog-posts.mjs`).
  - GBP links exist (`src/lib/site-config.ts:8-9`).
  - Social embeds are empty (`site-config.ts:19-24`).
  - Gira shares go to WhatsApp only.
  - No share button on packages. No referral program.
- **Gaps:** customers can't forward a package page easily, and on mobile forwarding a link on WhatsApp is how Honduran families decide together. The gira promotion produces no public content. There is no referral loop.
- **Opportunities:**
  - A "Compartir" button on package and destination pages (`navigator.share`, falling back to `wa.me/?text=<title> <url>`). The OG image already exists (`src/app/og/route.tsx`).
  - Gira requiring a public post (Top 10 #10).
  - Referral codes.
  - Fill `socialReels` with real posts once they exist.
  - GBP: post each new package and blog article as a Google Business "update" (owner routine, no code).
- **Recommended actions:** share button (S), gira and referral (S–M).

### 4.5 SEO
- **Current state:** Strong technical base:
  - unique metadata, canonicals and hreflang (`src/lib/seo.ts:46-54`)
  - `TouristTrip` with no Offer while prices are hidden (`src/app/paquetes/[slug]/page.tsx:51`)
  - `FAQPage`, `BreadcrumbList`, `BlogPosting`
  - dynamic sitemap (`src/app/sitemap.ts`)
  - `/llms.txt` (`public/llms.txt`)
  - robots rules (`src/app/robots.ts:3`)
- **Gaps:**
  1. **English duplicates.** The sitemap emits `/en/…` for every package, destination and blog post (`sitemap.ts:11-12`), and every page advertises an `en` alternate (`seo.ts:53`). DB content has no English fields, so `/en/paquetes/x` has English meta (`paquetes/[slug]/page.tsx:33`) over a Spanish body. That is a language mismatch Google treats as low-quality or duplicate, and it dilutes the Spanish pages. Roughly 54 URLs are affected (34 packages, 11 destinations, 9 posts).
  2. **Latent inventory.** 29 draft destinations, many of which have published packages (Japón, Bali, Kenia/Tanzania, Marruecos, Tailandia, Turquía, Egipto, Grecia…). Their package pages can't link to a destination page.
  3. **City pages** are copy plus links, with no CTA, no packages, no FAQs (`agencia-de-viajes/[city]/page.tsx:41-55`). As a service-area business with no local office, you are unlikely to rank in the local map pack for "agencia de viajes en San Pedro Sula". The organic result is winnable with a richer page.
  4. **Self-serving `AggregateRating`** won't produce stars in Google results (§4.3).
- **Can content beat OTAs?** Not on "vuelos baratos a Madrid". Yes on Honduras-specific intent that OTAs ignore: "requisitos para viajar a Colombia desde Honduras", "¿necesito visa para Dubái siendo hondureño?", "paquetes a Punta Cana desde San Pedro Sula", "quinceañera en Europa desde Honduras", "Semana Morazánica a dónde viajar". Your blog titles already aim at these.
- **Highest-ROI move for a solo owner:**
  - (a) Fix the English duplicates. This is a one-file change: only emit `/en/` and the `en` hreflang for pages with English content (static pages, city pages). DB-backed English detail pages get `noindex` until translated.
  - (b) Publish destinations that have packages and real copy.
  - (c) Build ten hand-checked requirements pages.
- **Recommended actions:** Top 10 #7. One new article every two weeks, targeted at a real query from Search Console, is sustainable. More than that isn't, for one person.

### 4.6 Automation & the advisor's time (no AI)
- **Current state:**
  - Automated: the lead email to soporte, the OTP email, the ticket email.
  - Manual: review invitations, quote and receipt sending (one click each), quote expiry, all reminders, all follow-ups.
  - Nothing is scheduled except backups (`.github/workflows/backup.yml`).
- **Ranked by hours saved:**
  1. Daily digest (Top 10 #4). This is the advisor's to-do list.
  2. "Crear cotización desde lead" (saves retyping on every quote).
  3. Quote item templates: saved item sets per package ("Punta Cana todo incluido — 5 noches", with hotel, flight and transfer lines) loaded into the quotation builder (`src/components/admin/quotation-builder.tsx`). This is templated scaffolding, not AI.
  4. Automatic review invitations on completion.
  5. Customer reminders (balance, documents, trip in 7 days).
  6. WhatsApp Business **app** quick replies and labels. Free, no code, and should be done this week.
- **WhatsApp Business (Cloud) API: keep it parked.** It needs Meta business verification, per-conversation template fees, a message-template approval process, and either a separate number or Meta's "coexistence" onboarding (Business app plus API on one number; check availability for Honduras). It adds real value only once reminder volume makes email insufficient, or once two or more advisors share one inbox. Revisit at around 150 or more leads a month, or when you hire a second advisor.

### 4.7 UX / UI
- **Current state:** Consistent with the Design Bible: tokens, Manrope, Lucide, one accent, no emojis. The "advisor, not a machine" message comes through in the approved Nosotros copy and the "Cómo funciona" steps.
- **Gaps:**
  - The human advisor is described but never shown. There is no advisor name, photo or voice anywhere. For a trust-based sale, a real face with the true line "Desde 2018" is the strongest anti-OTA signal you have. It needs your approval and a real photo.
  - The "no online payment" model isn't explained at the moment of decision: how payment works (tarjeta o transferencia coordinada con su asesor, `src/lib/legal-content.ts:27`) and what a quote commits them to.
  - Two copy defects: the footer uses the tú form "Encuéntranos en Google" (`messages/es.json:56`, violates `AGENTS.md` usted rule), and the Spanish footer shows an English IATA sentence (`messages/es.json:57`).
- **Recommended actions:**
  - A 3-line "Cómo se paga y qué pasa después" block next to each quote form (copy for your approval).
  - An advisor card (real photo and name) on home, Nosotros and the quote confirmation.
  - Fix the two strings.

### 4.8 Functionality & product gaps
- **Missing that customers expect:** share (see §4.4), save or compare packages (low priority, since WhatsApp is the comparison channel), status transparency in the portal (the portal shows reservation data. Add a simple timeline: cotización aceptada → pago recibido → documentos → viaje), and payment-plan visibility (balance remaining, next due date) from `payments`.
- **Built but underused:**
  - Discovery: 7 questions, then no contact (fix via #1). Also link it from package listing empty states and from the 404 page.
  - Requirements: a great tool with no CTA after the result (add "¿Le ayudamos a planificar este viaje?" with QuoteButton prefilled with the country).
  - Gira: private only.
  - Portal: only reachable if the customer knows it exists. Add the portal link and code to every quote and receipt email and to the reservation confirmation.
  - Currency toggle: prices are hidden, so the toggle changes only the budget label of "Viaje a medida" and the lead's `moneda` (`useCurrency` used only in `flight-tool.tsx:26`, `quote-button.tsx:13`, `package-quote.tsx:15`). Meanwhile it forces a cookie read in the root layout. Consider hiding the toggle until prices are shown.
  - Newsletter: signups are stored, but there is no way to send a newsletter or unsubscribe, and the success message promises "pronto recibirá nuestras novedades" (`messages/es.json:69`). Either pick a free sender (Resend Broadcasts, or Brevo/Mailchimp's free tier), export the list and send one seasonal email a month, or soften the promise.

### 4.9 Performance
- **Current state:** `next/image` with `preload` only on the first hero (`src/components/home/hero-backdrop.tsx:43-44`). Hero JPGs are about 290 KB each; destination JPGs 240–250 KB. Fonts are self-hosted with `display: swap`.
- **Gaps:**
  - **Every route renders dynamically.** The root layout reads a cookie (`src/app/layout.tsx:38`) and locale is resolved from a request header (`src/middleware.ts:12-13`). So every page view waits on the server and Supabase: home alone queries reviews, blog, FAQs, packages and destinations.
  - The TTFB from a Vercel region to a Honduran 3G/4G phone adds up.
  - Some gallery sources are large (for example `public/paquetes/medellin-y-santa-marta/5.jpg` at 3.6 MB). `next/image` resizes them, but the first optimization and cache misses are slow, and the originals cost repository and deploy weight.
  - Turnstile's script loads on every page with a form, including home.
- **Opportunities:**
  - **(S–M)** Cache the public content reads (`getPackages`, `getDestinations`, `getBlogPosts`, `getFAQs`, `getReviewSummary`) with the framework's data cache, tagged, and invalidate from the admin actions, which already call `revalidatePath` (`src/app/admin/actions.ts:125-128`). Pages stay dynamic, but Supabase round-trips disappear from most requests. Check the Next 16 caching guide in `node_modules/next/dist/docs/` for the current API before choosing one.
  - **(M–L)** Move locale into a route segment so pages can be statically generated with ISR. This is the bigger structural win.
  - **(S)** Pre-resize gallery originals to about 2000 px long edge and 80% quality before import.
  - Load Turnstile only when a form is scrolled into view or focused.
- **Measure first:** there are still no field Core Web Vitals (`docs/stage10.md` §Contenido). Turn on Vercel Speed Insights or check CrUX in Search Console after a month of traffic.

### 4.10 Security & privacy (forward-looking)
- **Current state:** Solid. Service role is server-only. All public POSTs are rate-limited with Turnstile and body caps (`src/lib/public-security.ts`). Admin is gated through `requireAdmin` and RLS. Portal access uses a hashed, expiring OTP with an attempt lock. Private buckets use signed URLs (`src/lib/reviews.ts:35-39`).
- **Gaps (new, see appendix):**
  - The portal session cookie never expires server-side and can't be revoked.
  - The CSP is report-only with no reporting endpoint, so the planned enforcement can never be verified.
- **Forward risks:**
  - **Passports in `portal-docs`:** add a retention rule, for example delete documents 90 days after `fecha_fin`, run from the daily job. This limits what a breach could expose.
  - **Leads with phone numbers:** once you add them (#1), leads are PII. State the retention period in Privacidad (for example 24 months) and add the phone field to the privacy text.
  - **Rate limit keyed on IP** (`public-security.ts:6-18`, leads at 10 per hour per IP, `api/leads/route.ts:6`): Honduran mobile carriers use carrier-grade NAT, so many customers can share one public IP. During an ad burst, legitimate users could hit 429. Key the limit on IP plus the verified human-session cookie, or raise the ceiling when a valid human session exists.
- **Honduras data protection:** there is a constitutional habeas-data right. A comprehensive personal-data law has been under discussion. Confirm the current status with local counsel. Regardless of the law, the rules above (minimize, set retention, restrict access) are low-cost good practice.

### 4.11 Architecture & scalability
- **10 → 100 → 1,000 leads/month:**
  - The code and the database handle 1,000 easily. Leads are a few KB each, and Supabase Free's 500 MB database is years away.
  - **The advisor breaks first:** at about 30–45 minutes of chat per lead (assumption), 100 leads a month is 50–75 hours, and 1,000 is impossible for one person.
  - **The second thing to break is Supabase Free Storage (1 GB):** passports and documents (up to 8 MB each, `docs/stage10-portal.md`), review photos and blog images share it. A few hundred documents can fill it. The retention rule helps, or move to Pro when you reach 60% usage.
  - **Resend free tier:** about 100 emails a day. The digest plus reminders fit, but a newsletter would not.
- **Hosting plan:** confirm which Vercel plan you use. Vercel's Hobby tier is limited to personal, non-commercial use, and a travel agency is commercial. Budget for Pro.
- **Content workflow:** content lives in `data/*.json` and images in `public/`, and changes need a script run plus a redeploy (`scripts/import-packages.mjs:14-25`). That works while you (or a developer) update monthly. It breaks when the advisor needs to add a seasonal package on a Tuesday. In-admin image upload for packages and destinations (a Storage bucket, reusing the blog-images upload at `src/app/api/admin/blog-images/route.ts`) is the fix. It is a bigger bet (§6).
- **Background jobs:** none exist yet. The daily job (#4) is the first. Keep it idempotent and single-route.

### 4.12 Business functionality (admin CRM)
- **Current state:**
  - Clientes, Cotizaciones (codes, PDF, email), Reservas (from accepted quotations), Pagos, Facturación (PDF, email), Tickets, Opiniones (plus invitations), Promociones.
  - Dashboard shows counts only (`src/app/admin/(protected)/page.tsx:7`).
- **Gaps:**
  - No lead → quote link.
  - No income or commission tracking.
  - No reporting by period, destination or segment.
  - No quote follow-up.
  - No repeat-customer view (reservations per customer, last trip date).
  - No upsell prompts.
  - The WhatsApp share buttons after sending a quote or receipt message yourself (see appendix).
  - Documents are labeled "Factura" while the business issues receipts, not fiscal invoices (see appendix).
- **Opportunities:**
  - Reports: leads by week; conversion from quote sent to accepted to completed; gross and net by month, servicio and segment; average days from lead to booking.
  - Customer page: trip history, "próximo contacto sugerido" (anniversary of last trip, next Semana Santa).
  - Upsell checklist on the quotation builder: seguro de viaje, traslados, asistencia, tours, equipaje, asientos. These are standard add-on lines the advisor ticks, which raises revenue per booking without effort.
- **Recommended actions:** Top 10 #3 and #9, plus the upsell checklist (S).

### 4.13 Anything else
- **New revenue lines, easiest first:**
  - Travel insurance on every international booking (commission; also reduces your liability).
  - Airport transfers and tours (high margin, low effort).
  - Visa-appointment assistance for the US and Schengen as a fixed-fee service. It is common in Honduras and highly searched, and it fits the requirements hub. It must be positioned as assistance, never as a guarantee.
  - Group departures ("salidas grupales") for Semana Santa and fin de año.
  - Corporate travel for local SMEs (one monthly relationship replaces dozens of one-off leads).
- **Moat:** real advisor, Honduras-specific content in Spanish (usted), history since 2018, local payment handling, and owned customer data (the CRM). Each review, referral and repeat customer compounds it. OTAs can't copy "I know your family and I handled your daughter's quinceañera trip".
- **The "10× qualified WhatsApp leads" idea:** a seasonal group departure product (for example "Semana Santa 2027 en Cartagena — salida grupal desde SPS/TGU", with fixed dates, a known itinerary and a price band) promoted by past customers' public videos (gira v2), captured through a form with phone and reference, and worked by a digest-driven advisor. Fixed dates create honest urgency. Groups multiply travelers per conversation. Public videos multiply reach. This is the combination most likely to change the numbers, and it needs your decision on showing dates and a price band for that product (§8).

---

## 5. Quick wins (each under 1 day)

- [ ] **Required WhatsApp number** (plus optional email) on hero, package and discovery forms; server validation; tests. (#1)
- [ ] **Reference code** in the WhatsApp message and in admin. (#1)
- [ ] **Confirmation panel** with an "Abrir WhatsApp" button instead of a blind redirect. (#2)
- [ ] **Leads list:** estado filter plus a "Escribir al cliente" `wa.me/<phone>` button. (#3)
- [ ] **Fix the admin WhatsApp share** after sending a quote or receipt so it goes to the customer's phone (appendix D1).
- [ ] **Readable lead email:** labeled lines, a `wa.me` link to the customer, a link to the admin record.
- [ ] **"Verificando…" label** on quote buttons while Turnstile resolves.
- [ ] **Sticky mobile "Solicitar cotización" bar** on package and destination pages.
- [ ] **Quote CTA on city pages and requirement results.**
- [ ] **Stop emitting `/en/` detail URLs and `en` hreflang for DB content** without an English translation.
- [ ] **Publish destinations** that already have packages and real, approved copy.
- [ ] **Share button** on package and destination pages.
- [ ] **Attribution:** page, referrer and UTM on leads. (#6)
- [ ] **Copy fixes:** "Encuéntrenos en Google" and the Spanish IATA line (`messages/es.json:56-57`), pending your approval.
- [ ] **Owner, no code:** import real Facebook and WhatsApp reviews with `scripts/import-reviews.ts`; set up WhatsApp Business app labels (Nuevo, Cotizado, Ganado, Perdido) and quick replies; post each package on the Google Business Profile; check the Vercel plan.
- [ ] **Gira copy** asking for a public post and its link (your approval). (#10)

## 6. Bigger bets (multi-week)

| Bet | Case for | When |
|---|---|---|
| **Daily job: digest, reminders, automatic reviews, quote expiry** (#4) | It replaces the advisor's memory. It is the base for every other automation. | Now, right after the quick wins. |
| **Lead → quote → booking linkage and reporting** (#3, #9) | Without it, no decision about ads, segments or flight-only leads is based on data. | Now. |
| **Segment landing pages** (quinceañeras, lunas de miel, grupos, corporativo) (#8) | Higher revenue per closing conversation. | After the funnel is fixed, before paid ads. |
| **Requirements-by-country content hub** | Durable organic leads on Honduras-specific intent. It must be hand-reviewed, because wrong visa information is a liability. | Q4 2026 – Q1 2027. |
| **In-admin image and content management for packages and destinations** | Removes the developer and script dependency for seasonal offers. | When you update content more than monthly. |
| **Cache or static rendering refactor** | Faster first load on Honduran mobile; fewer Supabase calls. | After measuring real Web Vitals. |
| **WhatsApp Cloud API** | Templated reminders inside WhatsApp; a shared inbox for two or more advisors. | Not before about 150 leads a month or a second advisor. |
| **English content translation** | Reaches the Honduran diaspora in the US, who buy trips for family. | Only if analytics show meaningful English traffic. Until then, keep English on static pages only. |

---

## 7. Revenue model analysis

**How the money is made.** The following industry-typical mechanics are what the figures below assume. Confirm each one against your host-agency agreement:
- **Packages, cruises and hotels:** commission from the wholesaler or cruise line, commonly around 8–15% of the sale, of which the host agency keeps a share (splits around 70/30 to 80/20 in the agent's favor are common).
- **Airline tickets:** in Central America airlines pay little or no commission, so agencies charge a service or issuance fee per ticket.
- **Add-ons (insurance, transfers, tours):** often carry higher commission percentages than the base package.

**Illustrative unit economics (every number here is an assumption; replace with yours):**

| Item | Package trip | Flight-only |
|---|---|---|
| Sale value | US$4,500 (2–3 travelers, 5 nights, Caribbean) | US$700 (2 tickets) |
| Your net income | ~10% × 75% split ≈ **US$340** + add-ons ≈ US$400 | Fee ~US$25–40/ticket ≈ **US$60** |
| Leads needed per booking | ~5–8 | ~3–5 |
| Advisor minutes per lead | ~40 | ~20 |
| **Advisor hours per booking** | **~3.5–5 h** | **~1–1.7 h** |
| **Net per advisor hour** | **~US$80–115** | **~US$35–60** |

What follows if these assumptions are roughly right:
1. Package, group and quinceañera leads are worth 2–3× more per hour than flight-only leads, so triage should put them first.
2. The biggest lever is close rate: from 1 in 7 to 1 in 5 raises income per hour by about 40% with no new traffic. The lead-quality fields (budget band, dates, phone) and faster follow-up (digest) drive close rate.
3. Add-ons are nearly free revenue per booking.

**12-month mix (scenario, not a forecast):** with 40 leads a month rising to 80 after the fixes and SEO, at a blended 1-in-6 close rate, you get 7–13 bookings a month. With a mix of 55% packages and cruises, 25% flights, 10% groups and quinceañeras, and 10% hotels and custom trips, that is roughly **US$2,000–4,500 a month of net income**, peaking in November–March (fin de año and Semana Santa sales) and early October. Put your real numbers in a copy of this table. The point is that one advisor saturates at around 80–120 leads a month. Beyond that, income grows only with a second advisor or higher value per lead.

**Levers, ordered:**
1. Stop losing leads (#1–2).
2. Faster, consistent follow-up (#3–4).
3. Focus on high-value segments (#8).
4. An add-on checklist on every quote.
5. Referrals and repeat customers (#10, plus reminders to past customers).
6. A service fee on flight-only quotes, or pointing flight-only leads to a lighter process.
7. Only then, paid acquisition.

**Time-to-quote reducers:** a prefilled quote from the lead; saved item templates per package; qualifying fields captured up front; a reference code, so no re-asking.

---

## 8. Constraint-change decisions (owner decisions, not code tasks)

**A. Show a "desde / referencial" price band on some packages.**
- *For:* A price qualifies the lead before it costs you advisor time, which is the scarcest resource in §7. It raises ad and search click-through. It allows `Offer` structured data. The code already supports it (`PACKAGE_DISPLAY_RULES.mostrar_precios`, `src/lib/packages.ts:13-24`), and the Design Bible anticipated "desde / referenciales" (§12).
- *Against:* Supplier rates change, competitors can see the price, and a band can anchor customers too low.
- *Middle path:* bands per person ("desde aprox. US$1,2xx por persona, referencial") on 5 flagship packages only, reviewed monthly.
- *Recommendation:* try it on 5 packages for 60 days and compare leads and close rate against the rest.

**B. Show dates for group departures only.**
- *For:* Fixed departures are the most honest form of urgency, and they are what makes the "10×" group idea work.
- *Against:* You commit to minimum group sizes.
- *Recommendation:* yes, for one seasonal group product (Semana Santa 2027).

**C. Deposit payment links (not on-site checkout).**
- *For:* The advisor sends a bank or processor payment link for the anticipo from the chat, which shortens the gap between "sí" and paid.
- *Against:* Fees and reconciliation.
- *Recommendation:* keep "no online payment on the site". Allow advisor-sent payment links if your bank offers them. This doesn't change the site.

**D. Single advisor.**
- *This is the real growth ceiling* (§4.11, §7).
- *For adding a commission-only associate advisor:* capacity for 2× the leads, coverage during trips and illness, seasonal peaks handled.
- *Against:* training, quality control, commission split.
- *Recommendation:* recruit before spending on ads. The admin already records `agente_id` on quotes and reservations (`src/lib/quotation-types.ts:29`), so per-advisor attribution is a small step.

**E. No AI.** Respected. Nothing in this audit needs AI: every recommendation is deterministic. If advisor time remains the ceiling after D, reconsider narrowly (for example, drafting quote text for advisor review). That is your decision, not a code task.

---

## 9. New defects found (appendix)

| ID | Severity | Location | Issue | Fix |
|---|---|---|---|---|
| D1 | Medium (ops) | `src/app/admin/cotizaciones/actions.ts:94-95`; `src/app/admin/reservas/actions.ts:174-175` | After sending a quote or receipt, "Compartir por WhatsApp" builds `wa.me/${siteConfig.whatsappNumber}`, which is **the agency's own number**, so it opens a chat with yourself. | Use the normalized `cliente_telefono`; hide the button when there is no phone. |
| D2 | Medium (security) | `src/lib/portal.ts:19-21, 32-43`; `src/app/mi-reserva/actions.ts:163` | The portal session value is `id.HMAC("portal:"+id)`. It has no expiry or nonce, so it never expires server-side (only the cookie's `Max-Age` limits it), it is identical on every login, and logout can't revoke it. A copied cookie gives indefinite access to that reservation's documents, including passports. | Sign an expiry and a random session id, as the pending cookie already does (`portal.ts:45-63`). Optionally store sessions for revocation. |
| D3 | Medium (security process) | `next.config.ts:6-21, 28`; `docs/csp-audit.md` | The CSP is report-only but has no `report-uri`/`report-to`, so no reports are collected. The documented gate ("review reports, then enforce") can never be met. | Add a reporting endpoint (Sentry offers a CSP report URL), collect for 2 weeks, then enforce. |
| D4 | Low–Medium (legal/compliance) | `src/lib/invoice-pdf.tsx:41, 47, 55`; `src/app/admin/reservas/actions.ts:163` | Documents and emails are titled "Factura", but the business issues receipts, not SAR fiscal invoices. In Honduras a "factura" carries fiscal requirements (CAI and others). | Confirm with your accountant. Likely rename to "Recibo" / "Comprobante de pago" in the PDF, email and portal (`messages/es.json:376, 380`). |
| D5 | Low (copy rule) | `messages/es.json:56-57` | "Encuéntranos en Google" uses tú (violates the usted rule), and the Spanish footer shows an English IATA sentence. | "Encuéntrenos en Google"; a Spanish IATA line (for your approval). |
| D6 | Low (SEO) | `src/app/sitemap.ts:11-12`; `src/lib/seo.ts:53`; `src/app/paquetes/[slug]/page.tsx:33` | English detail URLs for packages, destinations and blog posts serve Spanish body text under English metadata and are listed in the sitemap with hreflang. | Emit `en` alternates and `/en/` sitemap entries only for translated pages; `noindex` the rest. |
| D7 | Low (growth risk) | `src/lib/public-security.ts:6-18`; `src/app/api/leads/route.ts:6` | Rate limit of 10 leads per hour per IP. Carrier-grade NAT on Honduran mobile networks can put many customers behind one IP during a campaign. | Key on IP plus human-session, or raise the limit when a verified session is present. |
| D8 | Low | `src/app/gira/page.tsx:19` | The WhatsApp number is hardcoded instead of using `siteConfig.whatsappNumber`. | Use `siteConfig`. |
| D9 | Low (trust) | `messages/es.json:69`; `src/components/layout/newsletter.tsx` | The newsletter confirms "pronto recibirá nuestras novedades", but there is no sending or unsubscribe mechanism. | Set up a sender with an unsubscribe link, or change the message. |

---

## 10. What to investigate next

1. **Real funnel numbers (last 60 days):** leads in the database vs. WhatsApp chats that started from the site. Once references exist, count chats that include one. This single ratio sizes opportunity #1.
2. **Close rate and net income per booking**, by servicio. This replaces the assumptions in §7.
3. **Host-agency agreement:** commission schedule by product, split, ticketing fees, the exact wording approved for the IATA claim, and exclusivity terms.
4. **Search Console queries** after 4–8 weeks: which Honduras-specific queries show impressions. Write for those, not guesses.
5. **Vercel plan and Supabase Storage usage.** Confirm commercial-use compliance and headroom for documents.
6. **Where customers come from today** (Facebook, Instagram, TikTok, referrals, Google). Add "¿Cómo nos conoció?" to the quote confirmation, optional, one tap.
7. **Semana Santa 2027 (21–28 March):** is a group departure feasible with your suppliers? The decision is needed by November to sell it.
8. **Honduras data-protection status** and a retention policy for passports and leads (check with counsel).
9. **Receipt vs. factura** with your accountant (D4).
10. **Second advisor:** who, and on what commission terms, before any paid acquisition.

---

*sueña, descubre, sonríe.*
