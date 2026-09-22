# Auditoría CSP de Stage 14

La política se mantiene en `Content-Security-Policy-Report-Only`. No se habilita enforcement en este commit.

## Resultado de la auditoría

| Carga | Origen o comportamiento | Resultado |
| --- | --- | --- |
| Supabase y Storage | El origen de `NEXT_PUBLIC_SUPABASE_URL` se inserta en `img-src`, `connect-src` y `media-src`. `next/image` optimiza desde `/_next/image` y las imágenes públicas no optimizadas usan el origen de Storage. | Cubierto dinámicamente |
| Resend | `https://api.resend.com` solo se llama desde el servidor; no hay carga client-side. | No requiere CSP del navegador |
| Turnstile | `https://challenges.cloudflare.com` para el script, iframe y verificación client-side. | Cubierto |
| GA4 | `www.googletagmanager.com`, `www.google-analytics.com` y `region1.google-analytics.com`; solo después del consentimiento. | Cubierto |
| Meta Pixel | `connect.facebook.net` para el script y `www.facebook.com` para la conexión/beacon. | Cubierto |
| Instagram/TikTok | Los arreglos de embeds están vacíos hoy. Si se agregan URLs aprobadas, se cargan `www.instagram.com/embed.js` o `www.tiktok.com/embed.js` y sus iframes; se incluyen sus orígenes y CDNs comunes. | Cubierto para la integración existente |
| Google Fonts | `next/font/google` descarga Manrope durante el build y la sirve desde `/_next/static`, por lo que el navegador usa `font-src 'self'`. También se dejan `fonts.googleapis.com` y `fonts.gstatic.com` explícitos para una futura carga externa. | Sin bloqueo en la implementación actual |
| `/og` | Es una ruta same-origin que devuelve la imagen generada por Next. | Cubierto por `'self'` |
| Sentry | El SDK client-side no carga un script externo; con `NEXT_PUBLIC_SENTRY_DSN` envía eventos a un host `*.sentry.io`. | Cubierto por `connect-src https://*.sentry.io` |

La política anterior podía bloquear, si se activaban esas integraciones, los orígenes de Google Fonts, la ingesta client-side de Sentry y recursos CDN de embeds sociales. Supabase, Turnstile, GA4, Meta, `/og` y `next/image` ya tenían cobertura parcial o same-origin.

## CSP corregida para revisión

En la siguiente línea, `https://<supabase-project>.supabase.co` representa exactamente el origen derivado de `NEXT_PUBLIC_SUPABASE_URL`; el código lo inserta automáticamente al construir.

### Report-only — política activa

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://<supabase-project>.supabase.co https://www.facebook.com https://www.google-analytics.com https://*.cdninstagram.com https://*.fbcdn.net https://*.tiktok.com https://*.tiktokcdn.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://<supabase-project>.supabase.co https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com https://*.sentry.io; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com; media-src 'self' https://<supabase-project>.supabase.co https://*.cdninstagram.com https://*.tiktokcdn.com; manifest-src 'self'; upgrade-insecure-requests
```
### One-line switch after clean reports

In `next.config.ts`, replace the active header line with:

```ts
{ key: "Content-Security-Policy", value: csp },
```

Do this only after a production browser pass and report review show zero legitimate violations for the configured Supabase origin, consented analytics, Turnstile, embeds, Sentry, `/og`, and optimized/unoptimized images. Remove the report-only header once enforcement is enabled so the two policies do not diverge.
