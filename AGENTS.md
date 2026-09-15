# AGENTS.md — viatour build rules (read this first, every task)

You are building the **viatour** website: a Honduran travel agency selling **outbound** travel. It is a lead-generation + advisory site — customers submit quote requests that are captured in the database and handed off to a real advisor over WhatsApp. There is **no online payment and no automated booking**. viatour is "asesores de viaje," NOT a large automated booking marketplace.

Two source-of-truth documents govern everything: the **Design Bible** (design, components, voice, "never do this") and the **Build Brief** (decisions, stack, approved copy, phased plan). If a request conflicts with them, follow them and ask before deviating.

## Non-negotiable rules
- **Language:** All customer-facing text is Spanish (Honduras), addressing the user as **usted** everywhere — UI, marketing, legal.
- **No emojis** anywhere in UI or copy. Ever.
- **Never invent content**, reviews, credentials, stats, awards, partner logos, or copy. Use only approved text. If copy is missing, draft it and flag it clearly as needing approval — do not present invented copy as final.
- **Never mention response times or speed of reply** anywhere on the site.
- **No hype:** no all-caps shouting, no exclamation spam, no "¡Reserve YA!". Tone is profesional, confiable, experto, cercano.

## Design tokens (already defined in globals.css — use these, never hardcode new values)
- Colors: ink #12161C, ink-soft #5A6672, canvas #FFFFFF, surface #F5F7F8, line #E4E8EB, brand #1656D6, brand-deep #103FAE, brand-tint #E9F0FE, wa #25D366, wa-deep #1EBE5B, amber #F5A524, success #16A34A, error #DC2626.
- **One accent only** (brand). amber is for star ratings / occasional badges only — never a background or button. Green (wa) is ONLY for buttons/links that open WhatsApp.
- Type: Manrope everywhere; logo is separate artwork. Headings 700–800 with tight tracking; body/lead never in a heavy weight. Use the .t-display/.t-h1/.t-h2/.t-h3/.t-body-lg/.t-body/.t-small classes.
- Spacing: only 4,8,12,16,24,32,48,64,96,128. Radius: buttons/inputs 10, cards 16, panels 20. Shadows: only the two subtle ones (sm, md). Container max 1200px, 24px gutters (16 mobile). Section rhythm 96px desktop / 56 mobile.
- Icons: **Lucide only**, stroke 1.75–2px, in ink-soft or brand. Never emojis, never mixed icon styles.
- Imagery: real photos only. No AI-generated or stock-looking images. If a real photo is missing, use a clean solid/tonal placeholder. Alt text in Spanish on every image.

## WhatsApp mechanic (standard)
- Capture the lead in the database + notify support email FIRST, THEN open the prefilled wa.me link, so no lead is lost.
- WhatsApp number: +504 8866-8704 → link format `50488668704`.
- WhatsApp is the dominant CTA site-wide. CTA wording (usted): "Solicitar cotización", "Escríbanos por WhatsApp", "Pídanos su cotización", "Planifiquemos su viaje".

## Currency
- USD and HNL (lempiras), user toggle, default USD, remember the choice, always label the currency. Prices are "desde / referenciales" — final price confirmed over WhatsApp.

## Brand facts
- Name: viatour (lowercase). Tagline: "sueña, descubre, sonríe." used as a closing signature only.
- Offering travel services since 2018, starting on Facebook and WhatsApp. Domain: miviatour.com.
- Logo files: public/logo-black.png (header, on light) and public/logo-white.png (footer, on dark).

## The "never do this" list (anti-generic)
Emojis; fabricated reviews/credentials/stats/logos; AI/stock-looking images; floating stat cards over the hero; the same eyebrow label above every section; purple/violet or rainbow gradients or "AI blobs"; more than one accent color; body text in a heavy display weight; more than two type roles; every section animating identically on scroll; centering everything (mix intentional left-aligned + centered); low-contrast gray-on-gray text; inconsistent radii/shadows/spacing off the scale; mentioning response times; hype/all-caps/exclamation spam; neumorphism/glows/heavy colored shadows; claiming to be a large booking platform.

## Working method
- Follow the Design Bible and Build Brief. Build only the stage requested. State what you changed and what to verify. Ask before major structural or design deviations. Keep commits focused with clear messages.
