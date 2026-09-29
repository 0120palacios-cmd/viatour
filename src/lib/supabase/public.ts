import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cookie-less anon client for published, public content. It never carries a user session,
// so its results are identical for every visitor and safe to cache (see content-cache.ts).
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
