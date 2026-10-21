import { cookies } from "next/headers";
import { portalCookieName,verifyPortalCookie } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { travelDownload } from "@/lib/travel-download";
export const dynamic="force-dynamic";
export async function GET(request:Request){const id=verifyPortalCookie((await cookies()).get(portalCookieName)?.value);if(!id)return new Response("No autorizado.",{status:401,headers:{"Cache-Control":"private, no-store"}});return travelDownload(createAdminClient(),id,new URL(request.url).searchParams.get("format")==="ics",true);}
