# viatour pre-launch security audit

Date: 2026-09-18. Scope: local working tree at `226599b2e6fe44794cef72f2c72b7340a73c63e2`, all 12 reachable commits, installed dependencies, and supplied access requirements. Report-only: no application, configuration, migration, or dependency changes applied.

## 1. Executive summary

**Verdict: launch approval withheld.** One High application finding permits repeated unauthenticated service-role-backed review uploads without an application quota. Quote validation and security hardening also need attention. Server-side admin authorization, service-key isolation, Markdown sanitization, and the dependency audit show positive results.

**UNVERIFIED — needs manual check:** `security/db-state.md` does not exist. The user authorized continuing without it. No `supabase/` directory or committed SQL migrations exist. Consequently this report cannot certify live RLS, FORCE RLS, grants, views, functions, triggers, bucket settings, or Auth signup configuration. Missing evidence is a separate launch verification blocker, not an invented database vulnerability or an extra severity count.

| Severity | Findings |
|---|---:|
| Critical | 0 |
| High | 1 |
| Medium | 3 |
| Low | 2 |
| Total | 6 |

`npm audit --json` completed successfully: **0 advisories at every severity**. Existing isolated tests: **30 passed, 0 failed**. These tests mock authorization/database behavior and do not establish live database security.

## 2. MUST FIX BEFORE LAUNCH

- [H-01: Public review uploads have no application rate limit or cumulative quota](#h-01-public-review-uploads-have-no-application-rate-limit-or-cumulative-quota) — repeated valid requests can consume storage and database resources through service-role access.

Separate release gate: obtain and inspect the live database snapshot and run negative authorization tests before asserting the intended access model is enforced. No actual database exposure is claimed without that evidence.

## 3. Findings by severity

### Critical

None verified.

### H-01: Public review uploads have no application rate limit or cumulative quota

**Severity:** High. **Location:** `src/app/api/reviews/route.ts:6-53`, especially `25-27`, `40-47`; `README.md:72-74`.

**Problem:** Anyone can submit bounded, syntactically valid reviews and up to 3 MB per photo. Each accepted request uploads through the service-role client before inserting a pending review. There is no request-frequency limit, upload quota, challenge verification, or cumulative cap. The honeypot only rejects a populated `website` field; a script can omit it. The optional Origin check does not authenticate a caller and non-browser clients can omit or forge Origin. The README explicitly confirms no distributed limiter exists.

**Exploit/impact:** Repeated valid multipart requests with an empty honeypot create pending rows and distinct UUID photo objects, consuming storage, database capacity, bandwidth, and moderation effort. Approval gating protects review publication, but does not protect resource consumption. If the documented public bucket remains public, uploads are also retrievable before moderation. Successful live uploads, bucket publicity, hosting limits, and any Vercel firewall controls are **UNVERIFIED — needs manual check**; the missing application control is verified directly.

**Fix:** Add an atomic distributed limiter before body parsing/upload, server-verified bot protection where appropriate, and upload/storage budgets with monitoring and cleanup. Select limits appropriate for shared Honduran networks. Do not rely on process memory across Vercel instances. Audit direct anon database INSERT paths too: application limiting does not cover direct Supabase requests allowed by RLS. Any change to direct INSERT permissions needs an explicit access-model decision.

### M-01: Quote endpoint accepts unbounded raw payloads and lacks service-specific server validation

**Severity:** Medium. **Location:** `src/app/api/leads/route.ts:13-55`; `src/components/home/flight-tool.tsx:43-72`.

**Problem:** `request.json()` parses without an application byte limit. Outside the exact `contacto` branch, validation requires only a nonempty string `servicio`. Origin, destination, dates, passenger counts, cabin class, nested form data, array counts, field lengths, and service names are not validated against a server schema. The entire attacker-controlled payload is retained in the database. Unsupported currencies silently become USD and malformed budgets become null. Contact validation caps its expected fields but does not cap unrelated payload keys or the body. Quote submissions have no honeypot or limiter; contact has a honeypot only.

**Exploit/impact:** A caller can bypass browser validation with arbitrary service values, impossible travel data, and large unrelated nested data. If the database permits the insert, this pollutes leads and increases processing/storage cost; body parsing happens before database rejection. DB constraints and Vercel request limits are unverified. This is not SQL injection or demonstrated XSS.

**Fix:** Enforce a byte limit while reading, validate a discriminated service schema, reject invalid enums/numbers/dates, cap nesting and segment/room counts, store only an allowlisted normalized payload, and apply distributed abuse controls. Preserve lightweight package/destination CTA submissions when defining required fields.

### M-02: Repository does not set the requested security-header protections

**Severity:** Medium. **Location:** `next.config.ts:1-4`; `src/middleware.ts:4-8`; `src/lib/supabase/middleware.ts:4-41`.

**Problem:** Next config contains image restrictions only. Middleware sets `X-Robots-Tag`, not CSP, framing protections, nosniff, HSTS, referrer or permissions policies. No `vercel.json` exists. Headers added by Vercel or a separate proxy are unverified.

**Exploit/impact:** Without deployed framing protection, a malicious page can embed the site and attempt clickjacking, including authenticated admin UI if browser cookie rules permit the session. Missing CSP also removes a layer of script containment. This does not establish that an XSS injection exists.

**Fix:** Use the concrete recommended configuration in section F, verify deployed headers, then evaluate nonce-based CSP. Keep HSTS limited to production HTTPS and do not add preload/includeSubDomains without confirming all affected hosts.

### M-03: Auth cookies inherit defaults without a Secure flag

**Severity:** Medium. **Location:** `src/lib/supabase/server.ts:6-24`; `src/lib/supabase/middleware.ts:7-25`; `src/lib/supabase/client.ts:3-7`; `node_modules/@supabase/ssr/src/utils/constants.ts:3-10`.

**Problem:** Neither server client specifies `cookieOptions.secure`. The installed SSR defaults specify `sameSite: "lax"`, `httpOnly: false`, path `/`, and a 400-day max age, but no Secure attribute. Cookie adapters forward these options unchanged. No repository HSTS compensates for this.

**Exploit/impact:** If an authenticated browser makes an HTTP request to the cookie host before an enforced HTTPS upgrade, a cookie without Secure can accompany that request. Whether the deployed application emits these defaults and whether hosting/HSTS eliminates that request path are **UNVERIFIED — needs manual check**. Non-HttpOnly cookies additionally make tokens accessible to same-origin JavaScript if XSS occurs, but this is the documented browser-compatible Supabase SSR model, not by itself an auth bypass.

**Fix:** Set Secure consistently for production cookie writers and verify actual Set-Cookie headers through login, refresh and logout. Retain Lax unless session flow testing justifies a change. Do not mechanically force HttpOnly if a browser Supabase client needs token access; a server-only session architecture is Jose's decision. [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide) explains the browser-readable cookie design.

### L-01: Admin content validation omits field and collection limits

**Severity:** Low. **Location:** `src/lib/blog-validation.ts:6-25`; `src/app/admin/actions.ts:78-111`; contrast bounded FAQs at `55-58`.

**Problem:** Blog fields have no explicit length caps; package/destination text, includes lists, and embedded FAQ lists also lack field/count caps. Package `destination_id` is not UUID-validated in server code. Authoritative DB constraints are unavailable.

**Exploit/impact:** An authorized owner or compromised admin session can store disproportionately large content or submit invalid foreign keys, leading to expensive rendering and avoidable errors. The route is admin-gated; no public privilege escalation is established. Markdown remains sanitized.

**Fix:** Add agreed field/count limits and UUID validation to the server schemas, with matching editor feedback. Decide a suitable maximum Markdown article size before imposing it.

### L-02: Admin upload body cap depends on an untrusted Content-Length header

**Severity:** Low. **Location:** `src/app/api/admin/blog-images/route.ts:5-24`.

**Problem:** The 6 MB pre-parse check trusts Content-Length; a missing header becomes zero and a nonnumeric one becomes NaN. `request.formData()` can parse the full body before the actual 5 MB file check. The public review route correctly counts actual streamed bytes instead (`src/app/api/reviews/route.ts:12-23`).

**Exploit/impact:** An authenticated admin caller can omit the header and submit a larger multipart body, consuming memory before rejection. This is constrained by admin authorization and possibly hosting request limits, which are unverified.

**Fix:** Count streamed bytes before multipart parsing as the review route does, preserving a multipart overhead allowance and the 5 MB file cap. Keep existing MIME/signature checks.

## 4. Section-by-section results

### A. RLS & data exposure

**Live database: UNVERIFIED — needs manual check.** The following is a code-derived object inventory, not an exhaustive database inventory:

| Object | Application use and evidence | Live verification required |
|---|---|---|
| `public.leads` | Public INSERT without SELECT, `src/app/api/leads/route.ts:40-56`; admin reads, `src/lib/admin.ts:14-29` | ENABLED + FORCED RLS; deny anon/nonadmin SELECT/UPDATE/DELETE; safe INSERT columns/defaults |
| `public.reviews` | Public server route inserts allowlisted pending data, `src/app/api/reviews/route.ts:26-47`; admin reads/writes require gate | ENABLED + FORCED RLS; no public raw SELECT; pending-only direct INSERT; no public moderation changes |
| `public.packages` | Explicit columns and published filter, `src/lib/packages.ts:10-24` | ENABLED + FORCED RLS; published-only public SELECT; admin-only mutations |
| `public.destinations` | Explicit columns and published filter, `src/lib/destinations.ts:10-24` | Same published-only/admin-only requirements |
| `public.blog_posts` | Published filter but wildcard projection, `src/lib/blog.ts:19-22` | RLS flags, draft exclusion, grants; inspect all columns before calling wildcard safe |
| `public.faqs` | Explicit public columns, `publicado=true`, `src/lib/faqs.ts:10-11` | RLS flags, active/published semantic equivalence; admin-only mutations |
| `public.admins` | Provisioning described in `docs/admin.md:3` | All flags/grants/policies; no anon or nonadmin reads or self-provisioning |
| Newsletter table | No server implementation; `src/components/layout/newsletter.tsx:33-37` | Whether a table exists, its name, flags, INSERT/SELECT grants and policies |
| `public.reviews_publicas` | Explicit projection excludes email, reservation and estado, `src/lib/reviews.ts:9-10` | View definition, approved-only predicate, owner, `security_invoker`, table/column grants |
| `public.reviews_resumen` | Only aggregate counts/rating selected, `src/lib/reviews.ts:9` | Approved-only aggregate source, invoker option and grants |

**CLEAN at query layer:** Public review presentation queries views only, not raw reviews. Lead capture generates its ID locally and requests no returning row. Browser and server session clients use the anon key (`src/lib/supabase/client.ts:4-6`, `server.ts:6-8`); signed-in sessions may assume the authenticated role. Application filters are not a substitute for RLS: direct REST clients can omit them.

Cannot explicitly prove anon is unable to read leads, reviewer private columns, unapproved reviews, drafts, or admin rows. Snapshot sections 3b/5/6 were unavailable: column-level grants, view options, SECURITY DEFINER flags/search_path, triggers, and storage metadata remain unknown. Table-level SELECT grants must also be inspected because removing a column grant alone does not override table-level SELECT.

A default-owner view may bypass underlying RLS. Require scrutiny of every public view and safe approved-only predicates/projections. Do not blindly switch review views to invoker and grant raw review SELECT to restore functionality; that can violate the intended views-only access model. [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) describes grants, view behavior and invoker options. Whether these specific live views are unsafe is unverified.

The application publicly exposes `verificada` as a badge (`src/lib/reviews.ts:4,10`, `src/components/reviews/display.tsx:17-18`). This appears intentional in the Design Bible (`bible_desing.md:155`), but Jose should resolve whether the request's prohibition on moderation fields includes this badge. No email, reservation or `estado` projection was found.

**Migration drift:** No committed `.sql` migrations or `supabase/` directory; cannot compare against an absent snapshot. Missing reproducible DB security definitions is an operational gap, not evidence of a particular live policy defect.

### B. Secrets

**CLEAN in inspected source/reachable history:** `src/lib/supabase/admin.ts:1-8` imports `server-only`, reads an unprefixed service-role variable and disables persisted sessions. Its sole application caller is the server review handler (`src/app/api/reviews/route.ts:1,40`). The other consumer, `scripts/import-reviews.ts:58-67`, is a local CLI outside web source, guarded by direct invocation. No client file imports the elevated client and no public secret variable was found. Importing a `use server` action into a client form is a Next server-action reference, not bundling its server imports (`src/components/admin/forms.tsx:6`). No Resend integration or API credential consumer exists.

`.gitignore:33-37` excludes environment files except the blank template; `git check-ignore .env .env.local` confirms both ignored. `.env.example:1-13` contains empty keys/public measurement fields only. `git log --all --name-only -- .env .env.local .env.production` found no such files in reachable history.

Full `git log --all -p --full-history --no-ext-diff` (951,262 bytes; 12 commits) was scanned for JWTs, Supabase secret keys, common vendor/GitHub/AWS key prefixes, credential-bearing connection URLs, private keys, and quoted secret/password/token/API-key assignments. No hits. Current tracked text was scanned with the same credential patterns; source/docs were also searched for secret/auth usages. **No credential hit to list by commit/file.** `gitleaks` and `trufflehog` were unavailable on PATH. Pattern scanning cannot guarantee arbitrary unknown-format secrets were never committed, and unreachable commits, remote-only refs, provider settings and compiled deployment bundles were not available. `.env.local` values were not printed or copied into this report. Browser-bundle absence is supported by the server-only import boundary; deployed artifacts remain unverified.

### C. Admin / auth

**CLEAN in server code:** Middleware authenticates using `getUser()` and checks `is_admin()` before allowing admin navigation (`src/lib/supabase/middleware.ts:28-38`). Matcher exclusions can skip image-suffixed paths, but protected server pages/actions independently guard their reads/writes, so no bypass is established from this exclusion.

- Protected layout: `src/app/admin/(protected)/layout.tsx:9`.
- Dashboard: `src/app/admin/(protected)/page.tsx:5-9`.
- Lists: `src/app/admin/(protected)/[section]/page.tsx:26` calls `adminPage`, gated at `src/lib/admin.ts:21-23`.
- Editors: `src/app/admin/(protected)/[section]/[id]/page.tsx:16-24`; destination selector uses gated `adminRows`, `src/lib/admin.ts:14-16`.
- All content/status/delete mutations: `src/app/admin/actions.ts:34-44,115-118` calls `requireAdmin()` before database work, and allowlists tables, operations and state fields.
- Image API: `src/app/api/admin/blog-images/route.ts:4-10` authenticates independently and fails closed on RPC failure.

`requireAdmin()` validates the authenticated user server-side, then requires RPC data to be exactly true (`src/lib/admin.ts:5-11`). No client-sent admin flag/user ID authorizes these operations. Session clients, not service-role clients, perform admin CRUD. Live RPC correctness and policy-side gating on every operation remain **UNVERIFIED — needs manual check**.

No application signup/createUser/admin-grant endpoint found. `docs/admin.md:3` specifies manual Auth + admins provisioning. Supabase can expose Auth signup independently of site UI: verify dashboard signup disabled, anonymous sign-in disabled if unused, and no public RPC/trigger/admin INSERT route. Absence of a signup button does not prove provisioning is disabled.

Session adapters use `@supabase/ssr` getAll/setAll and preserve supplied options (`server.ts:10-22`, `middleware.ts:11-24`). Server guards validate with `getUser()`, never trust a decoded localStorage token or `getSession()` alone. Site localStorage use is consent only (`src/components/cookie-consent.tsx:21,32`). Defaults are Lax/non-HttpOnly with no explicit Secure: see M-03. Logout checks `signOut()` errors, invalidates layout and redirects to a fixed login URL (`src/app/admin/actions.ts:27-32`); nonadmin login signs out (`20-23`). Login has email-shape/password-presence checks but no application rate limiter or length caps (`11-19`); Supabase Auth rate limits, password policy and MFA are unverified. Verify refresh-cookie retention and logout/revocation in a real session.

### D. Input handling & injection

| Write path | Server validation / sanitization | Abuse/body/error status |
|---|---|---|
| Flight, hotel, package, custom, destination quote: `POST /api/leads` | JSON/object/nonempty service only; known column mapping; finite budget conversion, normalized currency; M-01 | No streamed body cap, limiter or quote honeypot; generic errors, code/ID-only logs (`route.ts:57-65`) |
| Contact: same route, `servicio=contacto` | `src/lib/contact-validation.ts:2-6`: name 120, email 254/format, message 3000, phone 40/character format; validated name/message mapped | Honeypot at `route.ts:25-27`; no limiter/body cap; extra raw payload retained |
| Review: `POST /api/reviews` | `src/lib/review-validation.ts:5-18`: bounded fields/email/integer rating; allowlisted data and forced pending/false/formulario (`route.ts:47`) | Streamed body cap 3 MB + 64 KiB; honeypot; optional same-origin check; MIME+signature checks; generic errors; no limiter/quota (H-01) |
| Newsletter | Client-only local validity/consent; **no server write path**, `src/components/layout/newsletter.tsx:21-37` | No data saved; UI explicitly says so (`40,59`); no invented missing endpoint vulnerability |
| Admin blog `save` action | Type/order/date/slug/cover validation, `src/lib/blog-validation.ts:7-25`; no text caps (L-01) | Admin-gated; generic DB errors; hosting/framework action body limits not runtime tested |
| Admin package/destination `save` | Name/slug, HTTPS image URL, safe order, USD/HNL and finite price; FAQ pairs; `src/app/admin/actions.ts:78-111` | Admin-gated; missing lengths/counts/foreign-ID validation (L-01) |
| Admin FAQ `save` | Question 500, answer 10000, category 120, safe integer order, `actions.ts:55-58` | Admin-gated; generic errors |
| Admin review/lead status `save` | Table/ID/state allowlists; forced boolean, `actions.ts:36-44,68-75` | Admin-gated; no arbitrary mass assignment |
| Admin blog image upload | User/admin gate, file size/MIME/signature, `src/app/api/admin/blog-images/route.ts:4-26` | Post-parse 5 MB cap; weak pre-parse cap (L-02); generic error |
| Owner CSV import | Headers, 500-row cap, formats/lengths/date/rating/source/boolean/duplicates, `scripts/import-reviews.ts:31-62` | Local CLI only; service role intentionally inserts approved owner imports |

**CLEAN Markdown:** `src/components/blog/markdown.tsx:1-6` uses react-markdown + remark-gfm + rehype-sanitize with `skipHtml`; no rehype-raw. Markdown images become alt text. Public blog and admin preview use the same renderer (`src/app/blog/[slug]/page.tsx:18`, `src/components/admin/blog-form.tsx:6,36`). The existing sanitizer test passed for scripts, handlers and dangerous URLs. React text output escapes lead/review/FAQ/destination content rather than interpreting it as HTML.

**CLEAN observed DB injection paths:** All application DB operations use Supabase query builders and bound values; no string-built SQL, SQL execution endpoint, shell execution from request data or dynamic raw query found. Allowlisted admin tables and fields limit mass assignment. RPC calls invoke the fixed name `is_admin`. Live SECURITY DEFINER functions, mutable search_path, trigger bodies and callable RPC privileges are **UNVERIFIED — needs manual check**; snapshot 5 was not supplied.

Public forms are not all wired to the required reliable capture mechanic: `src/lib/quote.ts:30-38` proceeds to WhatsApp after capture errors, and support notification remains TODO (`src/app/api/leads/route.ts:61`). This is a verified business-reliability deviation from `AGENTS.md` and `bible_desing.md:174`, not a separate security vulnerability. Contact does require successful capture (`src/components/contact-form.tsx:19-26`). Jose must decide the failure UX and support notification configuration.

### E. Storage

**UNVERIFIED — needs manual check:** all actual buckets/public flags, storage.objects grants/policies, public listing permission, bucket MIME limits, server-side bucket size limits and unknown private buckets. Snapshot 6 is absent.

| Code-referenced bucket | Verified upload/read behavior | Remaining live check |
|---|---|---|
| `review-photos` | Server-owned public submission uploads random paths; 3 MB, JPG/PNG/WebP + signature; no arbitrary path/upsert; `src/app/api/reviews/route.ts:31-49`. Public URL helper `src/lib/reviews.ts:17-18` | No direct anon upload/update/delete; correct public/bucket caps; quota controls; publicity before moderation |
| `blog-images` | Upload requires user + admin, 5 MB, matching MIME/signature, path user UUID + random UUID, no upsert; `src/app/api/admin/blog-images/route.ts:4-29`; cover URL restricted to project bucket (`src/lib/blog-utils.ts:3-7`) | Storage policy requires actual `is_admin()`, not just authenticated; bucket caps/public flag; deny anon writes |
| Package/destination covers | Admin saves HTTPS URLs (`src/app/admin/actions.ts:83-90`); no upload route for a cover bucket; `docs/admin.md:17` | Identify exact cover buckets, their flags/policies and upload tooling; do not infer bucket names |

No elevated client-side direct upload found. Client blog form POSTs to the guarded server route (`src/components/admin/blog-form.tsx:21-23`). Public review upload is a constrained server workflow, not exposure of the service key. Header-signature checks are not full image decoding/re-encoding; consider dimension limits and re-encoding for hostile image content when defining budgets.

`README.md:74,96` documents public review photos before approval; this is historical documentation, not a current live snapshot. Public buckets allow known URLs to be fetched independently of review-row RLS. Do not call this an unintended private-bucket exposure when the required model explicitly permits public review-photo reads. Decide whether pending-photo publicity is acceptable. Failed INSERT cleanup exists (`reviews/route.ts:48-49`) but thrown failures and failed removes can leave orphan objects; verify lifecycle cleanup.

### F. Headers & config

Currently defined: image remotePatterns restricted to configured Supabase host and `/storage/v1/object/public/**` (`next.config.ts:2-3`); `X-Robots-Tag` for admin/API (`src/middleware.ts:7`). The requested security headers are absent from repository configuration. Hosting headers are unverified.

**Recommendation only — exact addition to `next.config.ts`, merged with existing images:**

```ts
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // Compatibility baseline for App Router inline hydration scripts.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseOrigin} https://www.facebook.com`,
  "font-src 'self'",
  `connect-src 'self' ${supabaseOrigin} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
  `media-src 'self' ${supabaseOrigin}`,
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join('; ');

// Add these fields to the existing nextConfig object.
poweredByHeader: false,
async headers() {
  if (process.env.NODE_ENV !== 'production') return [];
  return [{
    source: '/:path*',
    headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    ],
  }];
},
```

Deploy first as `Content-Security-Policy-Report-Only` while testing, then change to the enforcement name above. This static compatibility baseline deliberately permits inline scripts/styles; it does **not** provide strong inline-XSS protection. For a stricter CSP, generate a fresh request nonce in middleware, propagate CSP on request/response, and attach the nonce to framework/JSON-LD scripts; remove unsafe-inline after verifying App Router hydration. This architectural choice needs performance/rendering review. The [Next CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) documents nonce integration. Installed Next header/CSP guides were also inspected. No unsafe-eval is needed in production; development should use separate rules.

GA/Meta sources match `src/components/analytics.tsx:25,30`. Fonts use next/font (`src/app/layout.tsx:4,14-19`), so Google Fonts browser origins are unnecessary. Supabase origin is explicit rather than wildcard; no realtime subscription exists, so no WebSocket origin is currently needed. YouTube origins support the brief's proposed embeds; none exists now. WhatsApp is top-level link navigation, not fetch/frame, so `wa.me` does not need script/connect/frame permission. Package/destination images allow arbitrary admin-supplied HTTPS hosts and render them unoptimized when outside Supabase (`src/components/packages/package-card.tsx`, `src/components/destinations/destination-card.tsx:7-10`); inventory approved image hosts before enforcement and add specific hosts or restrict editorial URLs. The policy may need exact additional analytics endpoints demonstrated in consented runtime testing; do not broaden it preemptively to all HTTPS hosts.

**Every `dangerouslySetInnerHTML` occurrence:**

| Location | Input and assessment |
|---|---|
| `src/app/layout.tsx:35` | Fixed `agencySchema` from `src/lib/seo.ts:7`; trusted literal, no attacker input |
| `src/app/nosotros/page.tsx:3` | Fixed AboutPage literal; trusted |
| `src/app/blog/[slug]/page.tsx:18` | DB editorial JSON-LD; JSON.stringify then replaces `<`; blocks closing-script injection |
| `src/app/destinos/[slug]/page.tsx:34` | DB editorial JSON-LD; same escaping |
| `src/app/paquetes/[slug]/page.tsx:23` | DB editorial JSON-LD; same escaping |
| `src/app/opiniones/page.tsx:11` | Public-review JSON-LD, including reviewer text/name; same escaping |
| `src/app/preguntas-frecuentes/page.tsx:13` | DB FAQ JSON-LD; `<` becomes JSON Unicode escape |

Some JSON-LD replacements use a doubled backslash escape and can change a literal `<` into literal backslash-u text after JSON parsing, but remove `<` and prevent `</script>` breakout. That is an encoding/content issue, not verified XSS. No other occurrence found.

**CLEAN observed redirects/SSRF:** Server redirects are fixed `/admin` or `/admin/login` (`src/app/admin/actions.ts:25,32`, `src/lib/admin.ts:8,10`); middleware uses a cloned URL with fixed login pathname and clears search (`src/lib/supabase/middleware.ts:33-36`). No router push/replace to a request URL found. WhatsApp builds a fixed destination with encoded text (`src/lib/quote.ts:38`, `src/components/contact-form.tsx:22`). No application server handler fetches a user-supplied URL; OG rendering reads a fixed local logo (`src/app/og/route.tsx:3-5`). Next image fetching is restricted by remotePatterns, and off-host editorial images are client-fetched unoptimized. Image-optimizer redirect/private-network handling and hosting behavior remain runtime checks, not a verified SSRF claim.

### G. Dependencies

`npm audit --json` returned exit 0, auditReportVersion 2, `vulnerabilities: {}` and zero info/low/moderate/high/critical advisories. Dependency metadata: prod 524, dev 289, optional 88, peer 0, peerOptional 0, total 850 (these categories can overlap).

**High/Critical advisory list:** none; no advisory-specific upgrade required. Direct versions include Next 16.3.5, React/React DOM 19.2.8, SSR 0.12.7; declared dependencies in `package.json:12-36` and resolved lockfile were checked. This result is registry knowledge at audit time, not proof of absence of unknown vulnerabilities.

No evidence established an abandoned dependency. `shadcn` is a production dependency (`package.json:25`), bringing scaffolding/CLI dependencies into the production install unnecessarily if unused at runtime. It is not imported by application source; moving it to devDependencies is a mechanical supply-chain reduction, not an advisory finding. No arbitrary downloaded code or request-driven execution path was found in application scripts. No live registry maintenance investigation was performed beyond npm audit; do not infer abandonment from package names.

## 5. Remediation lists

### (a) Safe to auto-apply — on approval

No fixes applied in this run.

- Add X-Frame-Options DENY, nosniff, strict-origin-when-cross-origin and the listed Permissions-Policy; disable X-Powered-By. Verify no required embedded feature regresses.
- Configure Secure auth cookies in production consistently in server/middleware and any browser cookie writer; retain Lax and current session architecture.
- Replace admin upload Content-Length-only precheck with a streamed byte limit (L-02), preserving existing file types and size.
- Validate UUID foreign keys before admin writes and preserve generic errors.
- Move unused scaffolding-only `shadcn` to devDependencies and refresh the lockfile without upgrading unrelated packages.
- After evidence is supplied, record DB security definitions and add negative policy tests. A view invoker change or permission rewrite is **not** safe to apply blindly under the current views-only model.
- No vulnerable dependency bump is currently needed.

### (b) Needs Jose's decision

- **Abuse controls:** What per-IP/window, daily upload and total-storage budgets are acceptable, and should a server-verified challenge be mandatory for review uploads? Select a distributed limiter/provider and treatment of shared-network users (H-01).
- **Direct public DB insertion:** Keep the explicitly required anon INSERT model, or route all public writes through guarded server workflows? Do not revoke anon INSERT without agreeing to change that model; define protection for direct API abuse.
- **Quote schema:** Which service identifiers, optional CTA fields, passenger/segment/room maxima and payload caps should the server accept? Avoid breaking package/destination/general quote buttons (M-01).
- **Public review contract:** Is `verificada` an approved public trust badge despite the ban on moderation fields? Should pending photos remain readable by known URL or move to private staging until approval? Define deletion/retention/cleanup rules.
- **CSP:** Approve exact external image/media/analytics hosts and choose the compatibility policy versus nonce-based strict CSP. Approve production HSTS after checking all affected hosts; preload/subdomain coverage needs separate confirmation.
- **Session architecture:** Retain browser-readable SSR tokens or adopt server-only HttpOnly sessions? Confirm admin MFA/password/session policy and disable signup at the provider, not just in UI.
- **Editorial limits:** What maximum article/text/list lengths are acceptable for blog/packages/destinations (L-01)?
- **Capture failure UX:** Should WhatsApp handoff stop on failed capture as required by AGENTS, and which provider should send notifications to the configured `soporte@miviatour.com` (`src/lib/site-config.ts:7`)? The existing fallback and missing email notification require a product/reliability decision.
- **Missing database evidence:** Who can export the live policies/grants/views/functions/buckets/triggers, and who will own migration reproducibility and security signoff?

## 6. Appendix: inspection and verification boundaries

Inspected repository inventory is listed below. Text assets underwent credential/access-pattern scanning; security-relevant handlers, helpers, rendering paths and authorization chains received detailed review. Binary logos were inventoried, not image-content audited. No live production writes, uploads, authentication attempts, destructive tests or deployment changes were performed.

Commands executed: `rg --files` and targeted `rg -n` scans; `git status --short`; `git ls-files`; `git log --all --format=...`; full `git log --all -p --full-history --no-ext-diff` scan; targeted env/ignore history; `git check-ignore .env .env.local`; `npm audit --json`; `Get-Command gitleaks,trufflehog`; isolated `node --test tests/admin.test.mjs tests/blog.test.mjs tests/leads.test.mjs tests/reviews.test.mjs tests/stage9.test.mjs tests/stage10.test.mjs` (30/30 passed). A Python scan attempt failed because Python was unavailable; the completed scan used Node/PowerShell instead. Node's initial git subprocess was blocked by the sandbox; the same read-only scan completed with escalation. No scan temporary files were created.

Additional inspected package sources: `node_modules/@supabase/ssr/src/utils/constants.ts`, `src/cookies.ts`, `src/createServerClient.ts`, `src/createBrowserClient.ts`, and package metadata; installed Next guides `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` and `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`. Public primary documentation links appear alongside relevant recommendations.

### UNVERIFIED — needs manual check

- Entire live database catalog, table flags including FORCED RLS, all policies and grants including column grants; view definitions/owner/invoker, RPC function privilege/search_path/SECURITY DEFINER behavior, triggers, and migrations/live drift.
- Negative REST tests with anon and authenticated nonadmin: all lead SELECT forbidden; raw review SELECT forbidden including email/reservation/estado; drafts/unapproved rows excluded; protected views disclose only public approved data; admin table reads and all content mutations forbidden. Test direct INSERT cannot set approved/verified/moderation fields. Use isolated staging fixtures and roll them back.
- Positive admin tests: each read/moderation/content CRUD path succeeds only with `is_admin()`, revoked admin sessions fail closed, and direct DB policy checks independently enforce the same authorization.
- All bucket metadata/policies; anon write/delete/list denial where required; MIME/size restrictions; private-bucket read denial; known-URL review-photo behavior before approval and orphan cleanup. Exact cover bucket names are unknown.
- Provider-side signup/anonymous-auth settings, password policy, MFA, Auth rate limits, admin provisioning RPCs/triggers and user lifecycle.
- Production login/refresh/logout cookie attributes and token revocation, session refresh through redirects, private page cache behavior, HTTPS enforcement and deployed security headers.
- Vercel firewall, quotas/body limits, proxy trust/IP handling, and distributed abuse controls outside the repository; test carefully without resource-exhaustion traffic.
- Production browser bundle/environment leakage, secret values in Vercel/Supabase settings, unreachable/deleted Git objects or remote-only history, and unknown-format secrets not covered by patterns.
- CSP/hydration/JSON-LD and GA4/Meta behavior before consent, after consent and after revocation; actual external image/video origins; image optimizer redirects/private-network protection. Live smoke scripts were inspected but not executed because they require runtime/database access.
- Newsletter persistence is not implemented; no database newsletter object can be certified. Privacy/legal text remains placeholders (`src/lib/legal-content.ts:1-3`); content approval and data retention require owner review, outside a verified technical vulnerability claim.

### Exact repository inventory

```text
.env.example
.gitignore
AGENTS.md
CLAUDE.md
README.md
bible_desing.md
build_brief.md
components.json
data/reviews-import.sample.csv
docs/admin.md
docs/blog.md
docs/stage10.md
docs/stage9.md
eslint.config.mjs
next.config.ts
package-lock.json
package.json
postcss.config.mjs
public/logo-black.png
public/logo-white.png
scripts/import-reviews.ts
src/app/admin/(protected)/[section]/[id]/page.tsx
src/app/admin/(protected)/[section]/page.tsx
src/app/admin/(protected)/layout.tsx
src/app/admin/(protected)/page.tsx
src/app/admin/actions.ts
src/app/admin/error.tsx
src/app/admin/layout.tsx
src/app/admin/loading.tsx
src/app/admin/login/page.tsx
src/app/api/admin/blog-images/route.ts
src/app/api/leads/route.ts
src/app/api/reviews/route.ts
src/app/apple-icon.tsx
src/app/blog/(listing)/loading.tsx
src/app/blog/(listing)/page.tsx
src/app/blog/[slug]/not-found.tsx
src/app/blog/[slug]/page.tsx
src/app/blog/error.tsx
src/app/contacto/page.tsx
src/app/destinos/[slug]/not-found.tsx
src/app/destinos/[slug]/page.tsx
src/app/destinos/error.tsx
src/app/destinos/page.tsx
src/app/globals.css
src/app/hoteles/page.tsx
src/app/icon.svg
src/app/layout.tsx
src/app/legales/cancelaciones/page.tsx
src/app/legales/cookies/page.tsx
src/app/legales/privacidad/page.tsx
src/app/legales/terminos/page.tsx
src/app/nosotros/page.tsx
src/app/not-found.tsx
src/app/og/route.tsx
src/app/opiniones/error.tsx
src/app/opiniones/loading.tsx
src/app/opiniones/nueva/page.tsx
src/app/opiniones/page.tsx
src/app/page.tsx
src/app/paquetes/[slug]/not-found.tsx
src/app/paquetes/[slug]/page.tsx
src/app/paquetes/error.tsx
src/app/paquetes/page.tsx
src/app/preguntas-frecuentes/page.tsx
src/app/robots.ts
src/app/sitemap.ts
src/app/styleguide/page.tsx
src/app/viaje-a-medida/page.tsx
src/app/vuelos/page.tsx
src/components/admin/blog-form.tsx
src/components/admin/faq-form.tsx
src/components/admin/forms.tsx
src/components/analytics.tsx
src/components/blog/card.tsx
src/components/blog/markdown.tsx
src/components/contact-form.tsx
src/components/cookie-consent.tsx
src/components/currency-provider.tsx
src/components/destinations/destination-card.tsx
src/components/home/flight-tool.tsx
src/components/home/quote-button.tsx
src/components/home/sections.tsx
src/components/layout/.gitkeep
src/components/layout/currency-toggle.tsx
src/components/layout/footer.tsx
src/components/layout/header.tsx
src/components/layout/newsletter.tsx
src/components/layout/public-chrome.tsx
src/components/layout/whatsapp-float.tsx
src/components/layout/whatsapp-link.tsx
src/components/legal-page.tsx
src/components/packages/package-card.tsx
src/components/reviews/display.tsx
src/components/reviews/form.tsx
src/components/sections/.gitkeep
src/components/ui/accordion.tsx
src/components/ui/button.tsx
src/components/ui/input.tsx
src/components/ui/sheet.tsx
src/components/ui/tabs.tsx
src/lib/admin.ts
src/lib/analytics.ts
src/lib/blog-utils.ts
src/lib/blog-validation.ts
src/lib/blog.ts
src/lib/contact-validation.ts
src/lib/destinations.ts
src/lib/faqs.ts
src/lib/image-optimization.ts
src/lib/launch-destinations.ts
src/lib/legal-content.ts
src/lib/navigation.ts
src/lib/packages.ts
src/lib/quote.ts
src/lib/review-validation.ts
src/lib/reviews.ts
src/lib/seo.ts
src/lib/site-config.ts
src/lib/supabase/admin.ts
src/lib/supabase/client.ts
src/lib/supabase/middleware.ts
src/lib/supabase/server.ts
src/lib/utils.ts
src/middleware.ts
src/types/.gitkeep
tests/admin.test.mjs
tests/blog-smoke.mjs
tests/blog.test.mjs
tests/destinations-smoke.mjs
tests/leads.test.mjs
tests/reviews.test.mjs
tests/stage10-smoke.mjs
tests/stage10.test.mjs
tests/stage9-smoke.mjs
tests/stage9.test.mjs
tsconfig.json
```
