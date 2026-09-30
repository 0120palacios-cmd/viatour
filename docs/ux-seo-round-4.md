# viatour: round 4 of UX, SEO and AI discoverability

Date: 2026-09-30 · Branch `ux-seo-round-4`. This round builds on `docs/ux-overhaul.md` (round 2) and `docs/ux-seo-round-3.md` (round 3) and does not redo their work.

**Method:**
- Screenshots of 18 routes at 390px and 1440px.
- An automated pass on 24 routes: headings, overflow, alt text, accessible names, touch targets, duplicate ids, JSON-LD types, the security widget's box, and disabled buttons.
- The `<title>` of every URL in the sitemap.
- A read of the forms, home, listing, reviews and SEO code.

Verification used a production build (`next build && next start`).

**Rules:** everything stays inside the Design Bible and Build Brief: tokens, type classes, Lucide icons, one accent, WhatsApp green only for WhatsApp, usted, no emojis, nothing invented. New interface strings are listed as drafts in `docs/copy-pending.md`.

---

## 1. Audit findings

Severity: **H** hurts customers or rankings measurably, **M** friction or lost opportunity, **L** polish.

| # | Sev | Finding | Where |
|---|---|---|---|
| A1 | H | **14 package titles were cut mid-phrase** in search results, e.g. "viatour \| Punta Cana Todo Incluido a su medida desde". The 60-character trim removed "Honduras" and left the connector word. | `fitMetaTitle` in `src/lib/seo.ts`, `src/app/paquetes/[slug]/page.tsx` |
| A2 | H | **Every form looked disabled at rest.** The submit button was greyed out and read "Verificando conexión segura…" until the background Turnstile check finished. This affects 7 forms: hero quote tool, package, quote buttons, contact, newsletter, reviews and discovery. On a slow phone connection the main conversion button looks broken. | `turnstile.tsx` and every form |
| A3 | M | Listing pages had no machine-readable catalogue. `/paquetes`, `/destinos` and `/blog` carried only a breadcrumb, so crawlers and AI systems had to open each card. | listing pages |
| A4 | M | On phones the home page was 13,450px tall. Main causes: three full-height guide cards (~1,700px), "Por qué viatour" as six stacked blocks (~1,900px), and a "Ver todos" button between the intro and the content of every section. | `sections.tsx`, `why-viatour.tsx` |
| A5 | M | `/opiniones` has 176 opinions over 6 pages with no way to narrow them. | `src/app/opiniones/page.tsx` |
| A6 | M | Newsletter consent read "…según la Política de Privacidad. Privacidad." (the phrase repeated as a separate link). | `newsletter.tsx` |
| A7 | L | Dropdowns used the browser's native arrow (a black triangle on Windows) beside the hero's custom fields with a Lucide chevron. | all `<select>` |
| A8 | L | With 11 destinations in three columns, the last desktop row held two tiles beside a gap. | `destination-card.tsx` |
| A9 | L | Images were served as WebP only. | `next.config.ts` |
| A10 | L | The footer heading "Cobertura / Coverage" was hard-coded in the component. | `footer.tsx` |

**Corrected finding.** The pass first reported a ~150px blank gap above every submit button. On inspection, the box holds Cloudflare's "Verifique que es un ser humano" checkbox, which Cloudflare shows to automated browsers. Full-page screenshots captured it as empty space, so it is not a bug for real visitors. The box now stays collapsed unless Cloudflare actually shows a challenge. That is correct in every case, but it is not claimed as a fix.

**Checked and fine:**
- One H1 per page, no horizontal overflow, alt text on every image, no duplicate ids.
- Canonicals and hreflang are in place, and every page has a title and description.
- The small-target flags were visually hidden radio inputs inside large labels.
- The "%c%d" console lines come from Turnstile's own logging (noted in round 3).
- The city page descriptions (~130 characters) are approved copy used verbatim (`docs/city-copy.md`), so they were left as they are.

---

## 2. Implementation plan

Order: rankings and conversion first, then machine-readable content, then layout and polish.

1. Titles that never break (A1).
2. Forms ready from the first paint (A2).
3. Collection structured data on listings (A3).
4. Shorter home page on phones (A4) and a full destination grid (A8).
5. Rating filter on reviews (A5).
6. Consent link, dropdown style, AVIF, footer string (A6, A7, A9, A10).
7. Verification: typecheck, lint, unit tests, build, screenshots and audit on the production build.

---

## 3. Implemented

**Titles (A1)**
- `fitMetaTitle` drops trailing connector words (desde, a, su, de, y, con, en…) after trimming.
- New `pickMetaTitle(...candidates)` takes the longest candidate that fits whole. Package pages offer three candidates, for example "viatour | Buenos Aires y Bariloche desde Honduras" when the "a su medida" version is too long.
- Verified: none of the 34 package titles now ends on a connector, and all are 60 characters or fewer.
- Tests are in `tests/seo.test.mjs`.

**Forms (A2)** (`src/components/turnstile.tsx`)
- `useHumanToken()` and `waitForHuman()`.
- The submit button shows its real label from the start ("Solicitar cotización por WhatsApp", "Continuar por WhatsApp", "Enviar mensaje", "Suscribirme"…).
- A submission made before verification finishes waits for it: the button shows the existing "Verificando conexión segura…" text and then submits by itself. If verification never completes, the form's existing error message is shown after 60 seconds.
- The server-side checks are unchanged: every POST is still verified, rate-limited and size-limited.
- The widget's box opens only between Turnstile's `before-interactive-callback` and `after-interactive-callback`.
- Applied to all 7 forms. The lead capture-first order is unchanged.

**Structured data (A3)**
- `collectionSchema()` in `src/lib/seo.ts` builds a `CollectionPage` whose `ItemList` carries the name, URL and photo of every entry. It is attached to the site's `WebSite` and agency by `@id`.
- Used on `/paquetes` (always the full catalogue, since region filters canonicalise to `/paquetes`), `/destinos` and `/blog`.
- Tested.

**Home on phones (A4)**
- Home guides swipe on phones, like packages and reviews. They stay a grid from 640px.
- "Por qué viatour" puts the icon beside the text on phones.
- "Ver todos …" actions (destinations, packages, reviews, guides, FAQ) sit beside the heading from 640px and after the content on phones (`SectionMore`).
- "Leer más" no longer wraps in narrow guide cards.
- Result: the home page on a 390px screen went from 13,450px to about 12,200px.

**Destination grid (A8)**
- When the count is 3n+2 (11 today), the first tile spans two columns from 1024px, so every row is full.
- The wide tile requests a larger image size.

**Reviews (A5)**
- Each row of the rating distribution is a link to `/opiniones?estrellas=N`. Low ratings are included, so the full picture is always one tap away.
- A status bar shows "Opiniones de 1 estrella: 10" with "Ver todas las opiniones".
- Pagination keeps the filter.
- The rating JSON-LD is emitted only on the unfiltered view, because a one-rating page would misrepresent the aggregate.
- Filtered URLs canonicalise to `/opiniones`.

**Polish**
- The consent text makes "Política de Privacidad" the link (`t.rich`; same wording).
- Unified select style: Lucide chevron, unlayered so the right padding survives `px-3`.
- `images.formats` puts AVIF first. Measured on the Punta Cana photo at 828px: 38 KB AVIF against 71 KB WebP.
- `footer.coverage` moved into the translations.

**Verification**
- `npm run typecheck`, `npm run lint`, `node --test "tests/*.test.mjs"` (92/92) and `npm run build` pass.
- Production-build audit of 10 routes: no disabled submit buttons at rest, `CollectionPage` on the three listings, one H1, no overflow.
- Before and after screenshots at 390px and 1440px.
- Forms were checked for their labels and verification flow but **not submitted**: `.env.local` points to the real database and email notifications.

## 4. Owner decisions (not implemented)
- **Featured packages:** all three featured packages on the home page are Caribbean (Punta Cana, Cartagena y Panamá, Cancún). Featuring one per region would show the range of the catalogue. The `destacado` flag is set in the admin.
- **Photos:** several Europe packages share the same Lisbon photo, and "Punta Cana Todo Incluido" still opens on a cartoon-character water park (round 3).
- **Itineraries:** "Punta Cana Todo Incluido" says 5 días / 4 noches but lists 4 days.
