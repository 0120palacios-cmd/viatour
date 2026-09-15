 viatour — Design Bible v1

*The single source of truth for the entire website. Every page, component, and line of copy follows this document. Its purpose is consistency and a real, established, professional feel — never AI-generated, never templated-looking. Feed this to Cursor as context for every build prompt.*

**Status:** Draft for approval. Two items need your explicit sign-off: the color palette (§3) and the website font (§4). Nothing gets built until this is approved.

---

## 1. Brand foundation

- **Name:** viatour — always lowercase, always with the trailing period in the logo lockup. In body copy, write "viatour" (lowercase). Never "Viatour," "VIATOUR," or "ViaTour."
- **Tagline:** *sueña, descubre, sonríe.* Used as a closing signature, not a headline. Written lowercase.
- **What we are:** una agencia de viajes — asesores de viaje. A real person who advises and arranges outbound trips for Honduran travelers.
- **What we are NOT:** an impersonal booking engine, an automated system, or "the next Booking.com." We never imply we are a large marketplace or that booking is self-service.
- **Positioning line (internal):** "Sus asesores de viaje, no una página más."
- **Brand attributes (every decision serves these):** cómoda (convenient), confiable (trustworthy), ágil (fast), experta (expert), humana (personal).
- **Model:** outbound travel only. Lead generation → personalized quote over WhatsApp. No online payment, no automated booking.
---

## 2. Logo usage

The black-on-white wordmark is currently the **only** brand asset. Rules:

- **Clear space:** keep padding around the logo equal to the height of the lowercase "o" in the wordmark. Never crowd it.
- **Minimum size:** never render the wordmark below 96px wide on screen (legibility of the tagline line).
- **Placement:** top-left of the header. Left-aligned, vertically centered.
- **Backgrounds:** the logo is black; only place it on white or very light surfaces. For any dark section or the footer, we need a **white/inverted version** — since you don't have one, the build will generate a white version programmatically (same artwork, white fill). This is the one permitted logo modification.
- **Favicon / app icon:** derived from the logo — use the "v" or the distinctive period mark on a solid brand-color tile. Specced in the build.
- **Never:** stretch, recolor (other than the approved white version), add effects/shadows/gradients, rotate, place on busy photos, or reconstruct the wordmark in a different font.
---

## 3. Color system — FOR APPROVAL

You had no preference, so this is designed to complement the bold black-and-white logo: a near-monochrome, airy, light foundation plus one confident, trustworthy accent. Blue is chosen deliberately — it reads as trust, reliability, and travel, which matches "confiable / profesional." WhatsApp green is reserved so green always means "this opens WhatsApp." Amber is a small warm highlight only.

| Token | Hex | Role |
|---|---|---|
| `ink` | `#12161C` | Primary text, echoes the logo's black without harsh pure-black |
| `ink-soft` | `#5A6672` | Secondary text, captions, muted labels |
| `canvas` | `#FFFFFF` | Page background, cards |
| `surface` | `#F5F7F8` | Alternating section backgrounds, input fills |
| `line` | `#E4E8EB` | Hairline borders, dividers |
| `brand` | `#1656D6` | Primary actions, links, active states, trust accent |
| `brand-deep` | `#103FAE` | Hover/pressed for brand |
| `brand-tint` | `#E9F0FE` | Light brand wash, selected chips, focus rings |
| `wa` | `#25D366` | WhatsApp actions ONLY |
| `wa-deep` | `#1EBE5B` | WhatsApp hover |
| `amber` | `#F5A524` | Star ratings, "destacado" badges — sparing use only |
| `success` | `#16A34A` | Positive form states |
| `error` | `#DC2626` | Errors, validation |

**Usage rules**
- One primary accent (`brand`). Do not introduce additional accent colors beyond this palette.
- `amber` appears only on rating stars and occasional badges. Never as a background or button.
- Green is never decorative — only on buttons/links that open WhatsApp.
- Text on `canvas`/`surface` uses `ink` (body) and `ink-soft` (secondary). Never gray-on-gray low-contrast text.
- All text/background pairings must meet WCAG AA (4.5:1 body, 3:1 large text).
---

## 4. Typography — FOR APPROVAL

**Decision:** The logo stays as true **Objektiv Mk2** artwork (no web license needed for the fixed logo image). For all website text we use **Manrope** — a clean, geometric, freely-licensed sans (Google Fonts / OFL) chosen because its geometry closely echoes Objektiv, it's highly legible as body text, it has a full weight range, and it is not one of the over-used defaults (Poppins/Montserrat/Inter) that make sites look generic. This gives brand-consistent, professional type at zero cost and zero licensing risk.

*Upgrade path (optional, later):* an Adobe Photography plan (~low monthly cost) includes Adobe Fonts, which carries Objektiv with web embedding — at which point site headlines could switch to true Objektiv. Not needed for launch.

**Alternative if you dislike Manrope:** Archivo (a more neutral grotesque). Say the word and we switch.

**Type scale** (desktop; scales down responsively). Family: Manrope throughout.

| Style | Size / Line-height | Weight | Use |
|---|---|---|---|
| Display | 56 / 60 | 800 | Hero headline only |
| H1 | 40 / 46 | 700 | Page titles |
| H2 | 30 / 38 | 700 | Section headings |
| H3 | 22 / 30 | 600 | Card titles, sub-sections |
| Body-lg | 18 / 30 | 400 | Intros, lead paragraphs |
| Body | 16 / 26 | 400 | Default text |
| Small | 14 / 22 | 500 | Meta, captions, labels |
| Button | 16 / 1 | 600 | All buttons |

**Rules**
- Two type roles max: the Objektiv logo, and Manrope for everything else.
- Never set body/paragraph text in a heavy display weight.
- Headings: weight 700–800, tight letter-spacing (-0.01em to -0.02em). Body: normal spacing.
- Line length for paragraphs: 60–75 characters max.
- No all-caps for headings or body. Small labels may use light letter-spacing, not all-caps shouting.
---

## 5. Spacing & layout

- **Spacing scale (px):** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Use only these values.
- **Container max width:** 1200px, centered, with 24px side gutters (16px on mobile).
- **Section vertical rhythm:** 96px top/bottom on desktop, 56px on mobile. Consistent everywhere.
- **Grid:** 12-column, 24px gutter. Cards typically span 3–4 columns.
- **Breakpoints:** mobile <640, tablet 640–1024, desktop >1024. Mobile-first.
- Generous whitespace is a core part of the "airy, professional" feel — do not crowd.
---

## 6. Radius, borders, elevation

- **Radius:** buttons/inputs/chips 10px; cards 16px; large panels 20px. One consistent system — no mixing random radii.
- **Borders:** 1px `line` for cards and inputs. Prefer borders over heavy shadows.
- **Shadows (subtle only):**
  - sm: `0 1px 2px rgba(18,22,28,.06)`
  - md: `0 12px 30px -12px rgba(16,63,134,.18)` (hover lift on cards)
- No large, dark, or colored drop shadows. No neumorphism. No glow effects.
---

## 7. Motion & interaction

- **Principle:** motion confirms actions and adds polish, never decoration. Restraint reads as professional.
- **Durations:** 150–200ms for hovers/toggles; 250–300ms for reveals. Ease-out.
- **Hover:** buttons darken to their `-deep` token; cards lift 2–4px with the md shadow. Interactive elements only.
- **Focus:** visible focus ring using `brand-tint` (3px) on every interactive element — never remove outlines.
- **On-scroll reveals:** at most a single subtle fade/rise, used sparingly. Do NOT animate every section identically on scroll — that is a hallmark of generic/AI sites.
- **Always** respect `prefers-reduced-motion`.
---

## 8. Iconography

- **One line-icon set: Lucide.** Consistent stroke width (1.75–2px), same size family.
- Icons are functional and quiet, in `ink-soft` or `brand`.
- **NEVER use emojis** as icons or in UI, anywhere. (This was a specific instruction and a key anti-AI rule.)
- No mixing icon styles (no filled + outline mix, no random emoji, no clip-art).
---

## 9. Imagery & media

- **Real photos only** — your actual destination photography. Authentic imagery is the single biggest anti-AI signal.
- **No AI-generated images. No generic stock that looks like stock.** If a real photo isn't available for a destination yet, use a clean solid/tonal placeholder rather than a fake-looking stock image.
- **Treatment:** consistent aspect ratios (cards 4:3 or 3:2; hero 16:9), gentle rounded corners (16px), no heavy filters. A subtle dark gradient overlay is allowed only where text sits on a photo, for legibility.
- **Video:** host destination videos on YouTube (or IG/TikTok once live) and embed; do not serve large video files directly (performance). Short clips only may live in Supabase storage.
- **Alt text** required on every image (Spanish, descriptive) — accessibility and SEO.
---

## 10. Component patterns

**Buttons**
- Primary: `brand` background, white text, 10px radius, weight 600. Hover → `brand-deep`.
- WhatsApp: `wa` background, `ink` text, Lucide WhatsApp icon left. Hover → `wa-deep`. Used for every "solicitar cotización / escribir por WhatsApp" action.
- Secondary/ghost: transparent, `line` border, `ink` text. Hover → `surface`.
- One primary action per view. WhatsApp is the dominant CTA site-wide.
**Hero flight tool** (Google-Travel style)
- Tabs: **Vuelos · Hoteles · Paquetes · Viaje a medida**. Active tab in `brand`.
- Vuelos fields: tipo (ida y vuelta / solo ida / multidestino), origen, destino, fechas, pasajeros, clase (Económica / Premium / Ejecutiva / Primera). Multi-city adds segment rows.
- Each tab's primary action is a **WhatsApp button** (not "Buscar") that composes a structured message from the fields.
- Clean, bordered container on the hero, generous field spacing, Lucide field icons.
**Inputs / forms**
- `surface` fill or white with `line` border, 10px radius, clear `ink` labels above fields.
- Focus: `brand` border + `brand-tint` ring. Errors: `error` border + message. Success states use `success`.
- Every field labeled (no placeholder-only fields). Required fields marked.
**Cards** (consistent internal padding 24px)
- Package card: photo (4:3), title (H3), short meta row, price with currency, WhatsApp "Solicitar cotización" button.
- Destination card: photo, name, link to destination page.
- Review card: star row (`amber`), review text, name, destination, date, "verificada" marker when applicable.
- Blog card: photo, category, title, excerpt, read link.
- Cards share one radius/border/shadow system. Vary content, not the shell randomly.
**Star rating**
- `amber` filled stars, `line` empty. Display average to one decimal (e.g., 4.8), total count, and a distribution bar breakdown on the reviews page. Averages auto-calculated from approved reviews only.
**Header:** white, sticky, subtle bottom `line`. Logo left; nav center/right (Inicio, Vuelos, Hoteles, Paquetes, Destinos, Opiniones, Blog, Nosotros, Contacto); WhatsApp button right. Mobile: hamburger → full-screen menu.

**Footer:** `ink` background, white/inverted logo, brand line, nav columns, legal links, social icons (activate when accounts exist), newsletter signup.

**WhatsApp float:** fixed bottom-right, `wa` color, Lucide icon + short label. Present on all pages.

**Newsletter:** simple email capture (name optional, email required), one clear value line, `brand` submit. Stored via Supabase; consent checkbox.

**States:** design loading (skeletons), empty ("aún no hay opiniones"), and error states for every dynamic area. These states are where cheap sites fail — they get first-class treatment.

---

## 11. The WhatsApp mechanic (standard)

- **Rule: capture the lead in our system first, then open WhatsApp.** Every quote/contact submission saves to Supabase and notifies the support email *before* opening the `wa.me` link, so no lead is lost if the customer doesn't press send.
- WhatsApp number: **+504 8866-8704** (format for links: `50488668704`).
- Prefilled message format (usted, no emojis in a way that looks unprofessional — a couple of restrained ones are acceptable in chat only, never in site UI):
  - Structured, labeled lines: Servicio, Nombre, Origen, Destino, Fechas, Pasajeros, Clase, Notas.
- Per-tab message templates defined in the build; package/destination buttons prefill their specific item.
---

## 12. Currency

- Support **USD and HNL (lempiras)** with a visible toggle.
- Default display: **USD**, switchable to HNL. Remember the user's choice.
- Formatting: USD `$1,299 USD`; HNL `L 32,000`. Always label the currency to avoid the "$" ambiguity.
- Prices are "desde / referenciales" — final price is confirmed over WhatsApp.
---

## 13. Voice & tone

- **Language:** Spanish (Honduras). **Address the customer as "usted" everywhere** — including UI, marketing, and legal. Professional and respectful.
- **Attributes:** profesional, confiable, experto, cercano — an advisor, not a machine.
- **Advisor framing:** speak as a real person who guides. "Le ayudamos a...", "Lo asesoramos para...", "Cuéntenos qué busca y le preparamos...".
- **Do:** be clear, warm, concise, confident. Explain, guide, reassure.
- **Don't:** never use emojis in site copy or UI. Never claim credentials you don't have. **Never mention response times or speed of reply** (explicit instruction). No hype, no exclamation-heavy tone, no "¡Reserva YA!".
- **CTAs (usted):** "Solicitar cotización", "Escríbanos por WhatsApp", "Pídanos su cotización", "Planifiquemos su viaje".
- **Tagline usage:** *sueña, descubre, sonríe.* as a closing signature only.
---

## 14. Content rules

- **All copy is approved by you. Nothing is invented, changed, or improvised without your sign-off.**
- **Reviews:** only real reviews. Import your genuine Facebook reviews and WhatsApp-screenshot reviews via the provided spreadsheet, with their real names and original dates. New reviews come through the form → moderation → your approval.
- **No fabricated:** credentials, stats, testimonials, awards, or partner logos. When you obtain real ones (e.g., IHT registration, CANATURH membership, IATA/host-agency accreditation), we add them.
- **Destinations at launch:** Punta Cana, Cartagena, Europa, Argentina, Medio Oriente, Dubái (con tours), cruceros, Río de Janeiro, Cancún, Salinitas, Panamá.
- **Cabin classes:** Económica, Premium, Ejecutiva, Primera.
---

## 15. SEO & metadata conventions

- **Focus: Honduras.** Keywords written natively in Spanish for Honduran outbound travelers (e.g., "paquetes a Punta Cana desde Honduras", "viajes a Dubái desde Honduras", "agencia de viajes en Honduras").
- **Spanish URL slugs:** `/vuelos`, `/hoteles`, `/paquetes`, `/paquetes/punta-cana`, `/destinos/dubai`, `/blog/…`. No locale prefix (single language).
- **Metadata:** unique `<title>` (~55–60 chars) and description (~150–160 chars) per page, following a pattern: `viatour | [Destino / Servicio] desde Honduras`.
- **Headings:** one H1 per page, logical H2/H3 hierarchy.
- **Structured data (JSON-LD):** `TravelAgency` (with real name, area served Honduras, WhatsApp contact), `Product`/`Offer` on packages, `Review` + `AggregateRating` on reviews, `FAQPage` on FAQ, `BlogPosting` on blog, `BreadcrumbList` sitewide.
- **Sitemap.xml** (dynamic, includes packages, destinations, blog) + **robots.txt**; clean indexability; canonical tags.
- **Open Graph / Twitter cards** per page using real imagery.
- Programmatic landing pages per destination are the core organic-traffic engine — each unique, real content, not thin.
---

## 16. Analytics, tracking & marketing

- Create fresh: **GA4** and **Google Search Console**. Create a **Meta Pixel** inside your existing Business Manager. Add the **TikTok pixel** once that account exists.
- **Google Business Profile:** set up as a service-area business for Honduras (address/phone for verification, not shown publicly).
- **Consent:** include a cookie-consent banner gating analytics/marketing scripts.
- **Track as conversions:** WhatsApp button clicks (per service/page), quote-form submissions, newsletter signups, review submissions. These are the business's key events.
- **Newsletter:** email capture stored in Supabase (or connected to an email tool later).
---

## 17. Accessibility

- WCAG AA contrast on all text.
- Visible focus states everywhere; full keyboard operability (menus, tabs, date pickers, forms).
- Descriptive Spanish alt text on all images; proper labels/ARIA on the flight tool and forms.
- Respect reduced-motion.
---

## 18. Performance

- Next.js SSR/SSG/ISR; optimize and lazy-load images (next/image); lazy-load social/video embeds.
- Minimal client JS; system-safe font loading (font-display: swap) for Manrope.
- Target strong Core Web Vitals; mobile-first (most Honduran traffic is mobile).
---

## 19. NEVER DO THIS — the anti-AI / anti-generic list

These are the tells that make a site look AI-made or cheap. All are prohibited:

1. Emojis anywhere in UI or copy.
2. Fabricated reviews, testimonials, credentials, stats, awards, or partner logos.
3. AI-generated or generic stock imagery that looks like stock.
4. Floating "stat cards" hovering over the hero image.
5. The same eyebrow/kicker label stacked above every single section in identical rhythm.
6. Purple/violet gradients, rainbow gradients, or "AI gradient blobs."
7. More than one accent color beyond the defined palette.
8. Body text set in a heavy display weight.
9. More than two type roles (logo + Manrope).
10. Every section fading/sliding in identically on scroll.
11. Centered everything; mix intentional left-aligned and centered layouts.
12. Low-contrast gray-on-gray text.
13. Random inconsistent radii, shadows, or spacing values off the scale.
14. Mentioning response times or reply speed.
15. Hype tone, all-caps shouting, exclamation spam.
16. Neumorphism, glows, heavy colored shadows.
17. Claiming to be a large booking platform / marketplace.
---

## 20. Sitemap (information architecture)

Inicio · Vuelos · Hoteles · Paquetes (+ individual package pages) · Viajes a medida · Destinos (+ individual destination pages) · Opiniones · Blog (+ guías de viaje / posts) · Nosotros · Contacto · Preguntas frecuentes · Legales (Términos, Privacidad, Cancelaciones, Cookies).

Plus: **Admin panel** (Supabase-backed) for moderating reviews and managing packages, destinations, blog posts, and leads.

---

*End of Design Bible v1. On approval — including the color palette (§3) and font (§4) — the next step is the phased Cursor build, starting with project setup, tokens, and the global layout (header/footer), then the hero flight tool, then each feature in sequence.*
