import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs/config";
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const storageOrigin = storage?.origin || "";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${[storageOrigin, "https://www.facebook.com", "https://www.google-analytics.com", "https://*.cdninstagram.com", "https://*.fbcdn.net", "https://*.tiktok.com", "https://*.tiktokcdn.com"].filter(Boolean).join(" ")}`,
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${[storageOrigin, "https://www.google-analytics.com", "https://region1.google-analytics.com", "https://www.googletagmanager.com", "https://www.facebook.com", "https://connect.facebook.net", "https://challenges.cloudflare.com", "https://www.instagram.com", "https://www.tiktok.com", "https://*.sentry.io"].filter(Boolean).join(" ")}`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com",
  `media-src 'self' ${[storageOrigin, "https://*.cdninstagram.com", "https://*.tiktokcdn.com"].filter(Boolean).join(" ")}`,
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: [
      // Keep report-only until production reports show zero blocked resources.
      { key: "Content-Security-Policy-Report-Only", value: csp },
      { key: "Strict-Transport-Security", value: "max-age=31536000" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
    ] }];
  },
  images: { remotePatterns: storage ? [{ protocol: storage.protocol === "https:" ? "https" : "http", hostname: storage.hostname, port: storage.port, pathname: "/storage/v1/object/public/**" }] : [] },
};
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withSentryConfig(withNextIntl(nextConfig), { silent: true, telemetry: false });
