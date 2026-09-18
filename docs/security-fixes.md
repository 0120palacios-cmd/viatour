# Pre-launch security fixes

Public writes use the service-role client. Leads, reviews and newsletter requests fail closed if the rate-limit RPC is unavailable. Limits are per route and first Vercel `x-forwarded-for` IP: 10 leads/hour, 5 reviews/hour and 5 newsletter requests/hour. Keep the RPC restricted to the service role.

Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` and `RESEND_API_KEY` in Vercel. Authorize production hostnames in Turnstile and verify `miviatour.com` in Resend. Notifications send from and to the existing configured support address. Email failures are logged and do not invalidate saved submissions. Turnstile tokens are never stored in submission payloads; widgets refresh after each attempt.

Quote JSON is limited to 32 KiB during streaming; newsletter JSON to 4 KiB. Quote fields are normalized and allowlisted by service. Passenger totals and room counts are capped at 20; flight segments at 6. Approximate dates for packages/custom travel remain free text (200 characters), while flight/hotel/segment dates must be real ISO calendar dates in order. Lightweight package/destination and general custom-travel buttons remain supported.

Admin field caps follow the existing FAQ style. Blog/destination bodies allow 100,000 characters; package descriptions 20,000; titles/slugs 200; URLs 2,048. Package inclusions allow 50 entries of 500 characters; destination FAQs allow 30 pairs with the existing 500/10,000-character caps. Admin image request bodies are counted while streaming (5 MiB plus 64 KiB multipart allowance), with an independent 5 MiB file cap and existing MIME/signature validation.

Production security headers use the audit compatibility CSP, initially report-only, with Turnstile script/frame/connect origins. The config includes the one-line enforcement switch. Production SSR and middleware cookies set Secure and retain sameSite lax.

## Verification before deployment

- Verify real Turnstile submissions on all form tabs, contact, review, newsletter and quote buttons; verify retry after a consumed/expired token.
- Verify the live RPC and newsletter unique-email constraint. Revoke anon INSERT grants for leads/reviews as planned.
- Verify a notification arrives for a lead and review; provider credentials and domain verification are required.
- Check production HTTPS auth Set-Cookie attributes and CSP reports, Supabase images and consent-gated GA4/Meta.
- Existing newsletter copy was retained as requested, including its draft/test and not-saved wording. That wording now conflicts with persistence and requires owner-approved replacement before launch. New security error strings and the verification accessible label are functional drafts pending copy approval.

No live database test writes, deployment, commits or pushes are part of this pass.
