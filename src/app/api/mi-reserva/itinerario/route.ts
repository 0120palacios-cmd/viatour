import { cookies } from "next/headers";
import { portalCookieName,verifyPortalCookie } from "@/lib/portal";
import { createAdminClient } from "@/lib/supabase/admin";
import { travelDownload } from "@/lib/travel-download";
export const dynamic="force-dynamic";
export async function GET(request:Request){const id=verifyPortalCookie((await cookies()).get(portalCookieName)?.value);if(!id)return new Response("No autorizado.",{status:401,headers:{"Cache-Control":"private, no-store"}});const query=new URL(request.url).searchParams;return travelDownload(createAdminClient(),id,query.get("format")==="ics",true,query.get("inline")==="1");}
