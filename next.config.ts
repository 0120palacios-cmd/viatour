import type { NextConfig } from "next";
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const csp = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com",
  "style-src 'self' 'unsafe-inline'", `img-src 'self' data: blob: ${storage?.origin || ""} https://www.facebook.com`, "font-src 'self'",
  `connect-src 'self' ${storage?.origin || ""} https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net https://challenges.cloudflare.com`,
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://challenges.cloudflare.com https://www.instagram.com https://www.tiktok.com",
  `media-src 'self' ${storage?.origin || ""}`, "manifest-src 'self'", "upgrade-insecure-requests",
].join("; ");
const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [{ source: "/:path*", headers: [
      // To enforce after compatibility verification, rename to Content-Security-Policy.
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
export default nextConfig;
