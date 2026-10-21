"use server";
import {requireAdmin} from "@/lib/admin";
import {validUuid} from "@/lib/quotation-validation";
import {renderReceiptPdf,type Receipt} from "@/lib/receipt-pdf";
import {siteConfig} from "@/lib/site-config";
import {escapeHtml} from "@/lib/travel-email";
import {revalidatePath} from "next/cache";
export async function sendReceipt(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const {client,user}=await requireAdmin();
 if(process.env.TRAVEL_EMAIL_ENABLED!=="true"||!process.env.RESEND_API_KEY)return {error:"Envío deshabilitado hasta la autorización del propietario."};
 const id=String(form.get("id")??"");if(!validUuid(id)||form.get("approved")!=="si")return {error:"Confirme el recibo y el destinatario."};
 const receipt=await client.from("payment_receipts").select("id,number,reservation_id,snapshot,created_at").eq("id",id).maybeSingle();
 if(receipt.error||!receipt.data)return {error:"Recibo no disponible."};
 const r=receipt.data as Receipt,customer=await client.from("reservations").select("cliente_email").eq("id",r.reservation_id).maybeSingle();
 const recipient=customer.data?.cliente_email;
 if(customer.error||typeof recipient!=="string"||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)||form.get("recipient")!==recipient)return {error:"El destinatario no coincide con el cliente registrado."};
 const pdf=await renderReceiptPdf(r);
 const claim=await client.from("travel_deliveries").insert({reservation_id:r.reservation_id,receipt_id:id,recipient,pdf_base64:pdf.toString("base64"),created_by:user.id}).select("id").single();
 if(claim.error||!claim.data)return {error:"Ya existe un intento para este recibo o falta la migración. Revise el historial."};
 let status="incierto",provider_id:string|null=null;
 try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`receipt/${claim.data.id}`},body:JSON.stringify({from:siteConfig.supportEmail,to:[recipient],reply_to:siteConfig.supportEmail,subject:`Su recibo ${r.number} | viatour`,text:`Le compartimos el recibo ${r.number} correspondiente al pago registrado. Consulte su reserva en https://www.miviatour.com/mi-reserva`,html:`<html lang="es"><body><h1>Recibo de pago · viatour</h1><p>Estimado/a ${escapeHtml(r.snapshot.customer)}, adjuntamos su recibo ${escapeHtml(r.number)}.</p><p><a href="https://www.miviatour.com/mi-reserva">Consultar reservación</a></p></body></html>`,attachments:[{filename:"recibo.pdf",content:pdf.toString("base64")}] }),signal:AbortSignal.timeout(20000)});if(response.ok){const body=await response.json();if(typeof body.id==="string"){provider_id=body.id;status="aceptado";}}else if(response.status>=400&&response.status<500)status="fallido";}catch{/* Outcome may be uncertain; no automatic retries. */}
 const saved=await client.from("travel_deliveries").update({status,provider_id}).eq("id",claim.data.id).eq("status","preparado");revalidatePath(`/admin/reservas/${r.reservation_id}`);
 return saved.error||status!=="aceptado"?{error:"Envío no confirmado. Revise el proveedor antes de reintentar."}:{success:"Recibo aceptado por el proveedor de correo; entrega aún no confirmada."};
}
