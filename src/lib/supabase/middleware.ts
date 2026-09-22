import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest, requestHeaders = request.headers) {
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if ((pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login") {
    const admin = user ? await supabase.rpc("is_admin") : null;
    if (!user || admin?.error || admin?.data !== true) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie));
      return response;
    }
  }
  return supabaseResponse;
}
