import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/mi-reserva", "/styleguide", "/en/admin", "/en/api", "/en/mi-reserva", "/en/styleguide"] }, sitemap: absoluteUrl("/sitemap.xml") }; }
