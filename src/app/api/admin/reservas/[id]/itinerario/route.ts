import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { travelDownload } from "@/lib/travel-download";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){const {client}=await requireAdmin();const {id}=await params;if(!validUuid(id))return new Response("No disponible.",{status:404});return travelDownload(client,id,new URL(request.url).searchParams.get("format")==="ics",false,new URL(request.url).searchParams.get("inline")==="1");}
