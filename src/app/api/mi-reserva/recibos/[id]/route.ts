import {cookies} from "next/headers";
import {portalCookieName,verifyPortalCookie} from "@/lib/portal";
import {createAdminClient} from "@/lib/supabase/admin";
import {validUuid} from "@/lib/quotation-validation";
import {renderReceiptPdf,type Receipt} from "@/lib/receipt-pdf";
export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const reservationId=verifyPortalCookie((await cookies()).get(portalCookieName)?.value);const headers={"Cache-Control":"private, no-store"};if(!reservationId)return new Response("No autorizado",{status:401,headers});const {id}=await params;if(!validUuid(id))return new Response("No disponible",{status:404,headers});const result=await createAdminClient().from("payment_receipts").select("id,number,reservation_id,snapshot,created_at").eq("id",id).eq("reservation_id",reservationId).maybeSingle();if(result.error||!result.data)return new Response("No disponible",{status:404,headers});const pdf=await renderReceiptPdf(result.data as Receipt);return new Response(pdf as BodyInit,{headers:{...headers,"Content-Type":"application/pdf","Content-Disposition":"attachment; filename=recibo.pdf"}});}
