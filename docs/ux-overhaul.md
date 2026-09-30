# viatour — UX/UI audit and overhaul plan

Date: 2026-09-29 · Scope: every public page, component, form and flow (admin and portal are out of scope unless shared components change them). Method: desktop (1440px) and mobile (390px) screenshots of 22 routes, an automated pass per page (heading outline, horizontal overflow, unlabeled inputs, touch targets, console errors), and a read of every public component.

All changes stay inside the Design Bible: same tokens, type classes, radii, two shadows, Lucide icons, one accent, WhatsApp green only for WhatsApp actions. No approved copy is rewritten. New interface strings are listed in `docs/copy-pending.md` as drafts.

Research basis (applied, not copied): Baymard (mark both required and optional fields; inline errors next to the field; avoid unnecessary fields), NN/g (one clear value proposition above the fold; carousels are ignored as primary content; visible navigation; 1cm touch targets), WCAG 2.2 (focus not obscured, 24px minimum target, pause control for moving content, no information in colour alone).

---

## 1. Findings

Severity: **H** blocks or misleads the customer, **M** adds friction or lowers trust, **L** polish.

### Global
| # | Sev | Finding | Where |
|---|---|---|---|
| G1 | H | Internal notes shown to customers: "Contenido funcional en borrador, pendiente de aprobación." on Contacto and FAQ, "Texto en borrador…" in the cookie banner. They read as an unfinished site. | `contacto/page.tsx`, `preguntas-frecuentes/page.tsx`, `cookie-consent.tsx` |
| G2 | H | Visible encoding bug: "Su opini?n nos ayuda mucho." | `messages/es.json` `reviews.googleSubline` |
| G3 | M | Header: Paquetes (the main product) is hidden inside a "Servicios" dropdown at the end of 9 items; "Inicio" duplicates the logo; "Mi reserva" wraps to two lines; the dropdown uses `role="menu"` without menu keyboard support and does not close on outside click or Escape. | `header.tsx` |
| G4 | M | Mobile menu is a flat list with the services sub-list behind a toggle, and the WhatsApp action at the very bottom. | `header.tsx` |
| G5 | M | Footer: an empty dashed box (IATA logo placeholder) looks broken; on mobile the footer is ~2.5 screens of single-column links; there is no direct contact block (number, email) and no copyright line. | `footer.tsx` |
| G6 | M | Page headers are inconsistent: some pages have breadcrumbs, some a "Volver" link, some nothing; top spacing varies (40/48/96px). | all pages |
| G7 | M | Cookie banner covers ~40% of the mobile viewport and stays sticky over content. | `cookie-consent.tsx` |
| G8 | L | Some sections use `py-12 sm:py-24` and others `section-space`; one rhythm should rule. | many |
| G9 | L | 404 page offers one link and no way forward. | `not-found.tsx` |

### Home
| # | Sev | Finding |
|---|---|---|
| H1 | H | The hero is a large white form panel over a photo that is barely visible. There is no statement of who viatour is or why to trust it above the fold; the first thing a visitor sees is 7 form fields and a verification widget. |
| H2 | M | "Pausar imágenes" is a large black button floating on the photo; it looks like a primary action. |
| H3 | M | 13 sections (17 mobile screens). Services repeats the hero tabs and the nav; the "Descubra su destino" and "Requisitos" sections are single-link bands; the order does not follow the decision journey (proof sits below the fold, after social links). |
| H4 | M | Service cards truncate their copy mid-word with an ellipsis ("Le ayudamos a encontrar opcio…"). |
| H5 | M | Destination grid: 11 full-width cards on mobile = 5 screens of scrolling with the name under each photo. |
| H6 | M | The reviews teaser shows only a histogram; no real review text is visible on the home page. |
| H7 | L | Section links are small underlined text ("Paquetes ↗") instead of clear secondary actions. |
| H8 | L | "Descubra su destino" copy is hard-coded Spanish (not translated on /en). |

### Listings
| # | Sev | Finding |
|---|---|---|
| L1 | H | /paquetes shows 34 packages in a horizontal swipe carousel on mobile (page height 2,585px, one card visible). Nobody browses 34 items sideways. |
| L2 | M | No way to narrow packages (by region) on a 34-item list. |
| L3 | M | Packages and blog posts without a photo show a blank grey block that reads as a failed image. |
| L4 | L | Blog filters are two rows of unstyled bordered links with no count or clear active state. |

### Detail pages
| # | Sev | Finding |
|---|---|---|
| D1 | M | Package quote panel repeats the package name twice and the heading "Solicitar cotización" as plain text before the real form heading. |
| D2 | M | Package form on mobile: every field is full width (adults and children each take a row), making the form ~2 screens long. |
| D3 | M | Destination page: the quote CTA appears three times with no hierarchy; the package section heading appears even when empty. |
| D4 | L | Info chips (duration, destination) wrap awkwardly on mobile beside the share button. |

### Forms and service pages
| # | Sev | Finding |
|---|---|---|
| F1 | M | Full (non-compact) quote tool on /vuelos, /hoteles, /viaje-a-medida lays fields in a narrow column with a large empty right side; "Tipo de viaje" is isolated. |
| F2 | M | Optional fields are marked in some forms ("(opcional)") and not in others; required asterisks are inconsistent. |
| F3 | L | Contact page lists WhatsApp, the number and two emails as loose lines with no hierarchy. |

### Reviews, about, other
| # | Sev | Finding |
|---|---|---|
| R1 | M | /opiniones: the page's primary blue button sends people to Google before they read anything; the summary is not sticky on desktop; pagination is plain text links. |
| R2 | L | Nosotros ends without a next step. |

---

## 2. Strategy

Principles: (1) every page answers "what is this, why trust it, what do I do next" in the first screen; (2) one primary action per view, WhatsApp green only for WhatsApp; (3) browse vertically, compare in grids, carousels only for "related" rows; (4) forms ask only what the advisor needs, mark optional fields, group related fields; (5) consistent shells: one page header, one section rhythm, one card system.

### Phase A — Global shell
- Header: top-level Paquetes and Destinos; "Servicios" disclosure holds Vuelos, Hoteles, Viaje a medida and Descubrir; logo is Home; "Mi reserva" as a quiet icon link that never wraps; disclosure closes on Escape and outside click and uses the disclosure pattern. Mobile menu: grouped sections, WhatsApp as the first full-width action.
- Footer: remove the empty logo box (keep the IATA text line), add a contact block, two-column link grid on mobile, copyright line.
- Hide draft notices from the public UI behind `siteConfig.showDraftNotices` (their text stays in messages; status is tracked in docs).
- Compact cookie banner (bottom card, not a full-width sticky slab).
- Shared `PageHeader` (breadcrumbs, H1, intro, optional actions) used by every public page.
- Useful 404 (links to packages, destinations, contact).

### Phase B — Home
- Hero: two-column on desktop — left: H1, the approved positioning line, three proof points (real advisor, since 2018, published rating when there is one), photo visible; right: the quote tool. Mobile: heading and proof first, then the form. Pause control becomes a small icon button.
- Order: Hero → Destinos → Paquetes destacados → Cómo funciona → Opiniones (rating + 3 recent reviews) → Por qué viatour → Servicios + Descubrir (one "¿Cómo quiere empezar?" band) → Guías → FAQ (with requisitos link) → Redes → Cierre → Newsletter.
- Destination tiles: name over the photo with a subtle gradient; 2 columns on mobile.
- Service cards show full copy (no truncation); section "see all" links become secondary buttons.

### Phase C — Listings
- /paquetes: vertical grid on every breakpoint, region filter chips with counts (URL `?region=`), result count.
- Tonal placeholder with an icon for missing photos (packages, blog).
- Blog filters as one row of chips with a clear active state.

### Phase D — Detail pages
- Package: clean quote panel (one heading, key facts, form); 2-column number fields on mobile; chips row tidy.
- Destination: one primary CTA in the header, secondary at the end; clearer section order.

### Phase E — Forms, service pages, contact, reviews, about
- Full quote tool grid: route/dates/travelers on a consistent 2–4 column grid.
- Consistent "(opcional)" and "*" marking across forms.
- Contact: WhatsApp card as the primary channel, email cards, form beside.
- Reviews: summary sticky on desktop, "Comparta su opinión" primary, Google secondary, button-style pagination.
- Nosotros: closing CTA block after the approved text (text untouched).

### Out of scope / owner decisions
- New photography (packages and blog posts without images need real photos).
- Changing approved headlines (e.g. the hero H1 "Cotice con nosotros.") — kept as is.
- Showing prices (controlled by `PACKAGE_DISPLAY_RULES`).

## 3. Verification
`npm run typecheck`, `npm run lint`, `node --test "tests/*.test.mjs"`, `npm run build`, and a before/after screenshot pass at 390px and 1440px of the same 22 routes.

## 4. Implemented (2026-09-29, branch `ux-overhaul`)
- **Shell:** new header (Paquetes/Destinos top level, Servicios disclosure with descriptions, Escape/outside-click close, quiet "Mi reserva", segmented ES/EN, skip link, 1280px desktop breakpoint, visible WhatsApp from 640px); grouped mobile menu with WhatsApp first; footer rebuilt (contact block, 2-column links on mobile, no empty logo box, copyright + legal row); compact cookie card; `PageHeader` on listings, contact, FAQ, reviews, services; useful 404; draft notices behind `siteConfig.showDraftNotices`; the global link rule no longer overrides links with their own flex layout.
- **Home:** two-column hero (message + proof points + live rating beside the quote tool, darker photo treatment, small pause control); journey order; destination tiles with names on the photo (2 columns on mobile); packages capped at 6 with a "see all" button; 3 real recent reviews next to the rating; services as full-copy link cards plus the discovery call-out; FAQ + requirements merged; slim social band; closing CTA panel.
- **Quote tool:** fixed the collapsed full layout (`details` + `display: contents`); segmented trip type; 2-column compact form; email only in the full form; phone hint under the phone field; clearer error box.
- **Listings:** /paquetes grid on all sizes with region chips and a count; tonal placeholders for missing photos; blog cards fully clickable with one chip row of filters.
- **Detail pages:** package breadcrumbs, fact chips, first-screen "Solicitar cotización" on mobile, one clean quote panel (no repeated title or meaningless price line); destination breadcrumbs, one CTA per zone, closing panel.
- **Other pages:** service pages with the tool beside "Cómo le ayudamos"; contact with WhatsApp card first; FAQ with category jump links; reviews with sticky summary and actions, numbered pagination; Nosotros closes with a CTA; city pages with real cross-link cards.
- **Copy:** see `docs/copy-pending.md` (section "Copy de la revisión UX/UI").

Verification: `npm run typecheck`, `npm run lint`, `node --test "tests/*.test.mjs"` (78/78) and `npm run build` pass. Before/after screenshots were compared at 390px and 1440px.

### Still open (need the owner)
- Real photos for the packages and blog posts that show placeholders.
- Hero headline wording ("Cotice con nosotros." is kept as approved).
- Approval of the new interface strings.
