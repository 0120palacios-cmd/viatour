import type { NextConfig } from "next";
const storage = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
const nextConfig: NextConfig = { images: { remotePatterns: storage ? [{ protocol: storage.protocol === "https:" ? "https" : "http", hostname: storage.hostname, port: storage.port, pathname: "/storage/v1/object/public/**" }] : [] } };
export default nextConfig;
