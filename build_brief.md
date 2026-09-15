# viatour — Build Brief & Locked Decisions

*Companion to the Design Bible. This is the project briefing: what we're building, the decisions that are final, the approved copy, and the build sequence. Used as Claude Project knowledge for every build chat. If anything here conflicts with a request, follow this document and ask before deviating.*

---

## 1. What this is

A production website for **viatour**, a Honduran travel agency selling **outbound** travel only. The site is a lead-generation and advisory platform: customers browse and submit quote requests; every request is captured in our database and then handed off to **WhatsApp**, where a real advisor personally prepares the quote and closes the sale. There is **no online payment and no automated booking** on the site.

- **Brand:** viatour (lowercase). Tagline: *sueña, descubre, sonríe.*
- **Positioning:** asesores de viaje — personal, human guidance. NOT a large automated booking marketplace.
- **Market & language:** Honduras only. Spanish, addressing customers as **usted** everywhere. No emojis in UI or copy.
- **Domain:** miviatour.com
- **WhatsApp:** +504 8866-8704 (link format: 50488668704)
- **Notification email:** the support/help address on the domain (e.g., soporte@miviatour.com) receives new leads and review alerts.
---

## 2. Locked decisions

- **Model:** WhatsApp-based quotes. Capture lead in database + notify support email FIRST, then open a prefilled wa.me message.
- **Services / hero tabs:** Vuelos · Hoteles · Paquetes · Viaje a medida (each with its own fields + a WhatsApp action).
- **Flight fields:** tipo (ida y vuelta / solo ida / **multidestino**), origen, destino, fechas, pasajeros, clase (Económica / Premium / Ejecutiva / Primera).
- **Currencies:** USD and HNL (lempiras), user toggle, default USD, always labeled.
- **Destinations at launch:** Punta Cana, Cartagena, Europa, Argentina, Medio Oriente, Dubái (con tours), cruceros, Río de Janeiro, Cancún, Salinitas, Panamá.
- **Reviews:** open submission AND invitation-based; fields = nombre, calificación, texto, destino, foto (opcional), número de reserva (opcional), email (**requerido**). Flow: submit → moderation → owner approves/rejects → publish. Star average and totals auto-calculated from approved reviews only.
- **Admin panel:** owner moderates reviews and manages packages, destinations, blog posts, and leads.
- **Content:** blog + detailed travel guides.
- **Reviews import:** real existing Facebook reviews + WhatsApp screenshots, with real names and original dates (spreadsheet import). Nothing invented.
- **No response-time claims anywhere.**
- **Credentials:** none claimed until real (future: IHT registration, CANATURH membership, IATA/host-agency accreditation — verify before displaying).
---

## 3. Tech stack (single project)

- **Framework:** Next.js (App Router) + TypeScript — one codebase for frontend and backend (API routes / server actions).
- **Styling:** Tailwind CSS + shadcn/ui (themed with viatour tokens from the Design Bible — never default-looking).
- **Backend/data:** Supabase — Postgres database, file/image storage (review photos, destination images), auth for the admin panel, moderation backend.
- **Hosting:** Vercel — one deployment.
- **Fonts:** logo stays as real Objektiv Mk2 artwork; site text uses **Manrope** (free) unless changed. (Optional later: true Objektiv via Adobe Fonts.)
- **Video:** destination videos via YouTube/social embeds, not served directly.
- **Analytics/marketing:** GA4 + Google Search Console (fresh), Meta Pixel (in existing Business Manager), TikTok pixel later, cookie-consent banner, Google Business Profile (service-area, Honduras).
---

## 4. Approved copy — "Nosotros" (final, do not alter without approval)

> **Somos sus asesores de viaje, no una página más.**
>
> En viatour creemos que planear un viaje no debería sentirse como pelear con una máquina. Desde 2018 acompañamos a viajeros hondureños a descubrir el mundo, primero a través de Facebook y WhatsApp, y hoy desde esta plataforma pensada para hacerlo todo más simple.
>
> La diferencia es sencilla: cuando usted nos escribe, habla con una persona real. No con un sistema automático ni con un formulario que nadie lee. Alguien que lo escucha, entiende lo que busca y lo guía para tomar la mejor decisión para su viaje, su presupuesto y su tiempo.
>
> Somos asesores, no un buscador impersonal. Esa cercanía es lo que nos permite armarle opciones a su medida —vuelos, hoteles, paquetes o un viaje completamente personalizado— y explicarle cada detalle con claridad, para que usted reserve con confianza y sin complicaciones.
>
> Nuestro compromiso es que su experiencia sea cómoda, confiable y ágil, desde la primera pregunta hasta que regresa a casa con una buena historia que contar.
>
> **viatour — sueña, descubre, sonríe.**

Founding facts (true, usable): offering travel services since **2018**, starting on Facebook and WhatsApp. Brand feeling: cómoda, confiable, ágil. Differentiator: personal human advisor vs. impersonal booking site.

---

## 5. Phased build sequence

Each stage is produced as a Cursor prompt, one at a time, and verified before moving on.

1. **Project setup** — Next.js + TS + Tailwind + shadcn/ui + Supabase; repo structure; environment config; design tokens from the Design Bible (colors, type scale, spacing, radius, shadows); base typography (Manrope) and global styles.
2. **Global layout** — header (logo, nav, WhatsApp button, mobile menu), footer (inverted logo, nav, legal, social placeholders, newsletter), floating WhatsApp button, currency toggle.
3. **Home + hero flight tool** — the Vuelos/Hoteles/Paquetes/Viaje a medida tabbed tool with WhatsApp composition + lead capture; home sections.
4. **Packages** — listing + individual package pages, WhatsApp quote buttons, structured data.
5. **Destinations** — hub + individual destination landing pages (SEO engine).
6. **Reviews system** — submission form, moderation, admin approval, auto-calculated ratings, structured data; import tool for existing reviews.
7. **Admin panel** — Supabase-auth dashboard to moderate reviews and manage packages, destinations, blog, and leads.
8. **Blog + guides** — listing, post/guide pages, categories.
9. **Contact, Nosotros, FAQ, Legales** — including cookie consent.
10. **SEO + analytics wiring** — metadata, JSON-LD, sitemap, robots, GA4, Search Console, Meta Pixel, consent, conversion events; performance pass.
---

## 6. Working method

- All work follows the **Design Bible** (design, components, voice, "never do this") and this Brief (decisions, copy, stack).
- Every stage: state what it covers, produce the exact Cursor prompt, then list what to verify before the next stage.
- Never invent content, credentials, reviews, or copy. All customer-facing text in Spanish (usted), no emojis.
- Ask for approval before major structural or design deviations.
