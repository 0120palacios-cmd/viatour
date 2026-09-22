import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { defaultLocale } from "@/i18n/config";

export async function middleware(request: NextRequest) {
  const originalPathname = request.nextUrl.pathname;
  const isEnglish = originalPathname === "/en" || originalPathname.startsWith("/en/");
  const pathname = isEnglish ? originalPathname.slice(3) || "/" : originalPathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-viatour-locale", isEnglish ? "en" : defaultLocale);
  requestHeaders.set("x-viatour-pathname", pathname);
  const response = await updateSession(request, requestHeaders);
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api" || pathname.startsWith("/api/")) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  if (!isEnglish || pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/api" || pathname.startsWith("/api/")) return response;
  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = pathname;
  const rewritten = NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } });
  response.cookies.getAll().forEach((cookie) => rewritten.cookies.set(cookie));
  return rewritten;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
