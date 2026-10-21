"use server";
import {requireAdmin} from "@/lib/admin";
import {getAdminReservation} from "@/lib/reservation-data";
import {getTravel} from "@/lib/travel-data";
import {renderItineraryPdf} from "@/lib/itinerary-pdf";
import {renderTravelCalendar} from "@/lib/travel-calendar";
import {expandedDetails,sanitizeDetails} from "@/lib/quotation-details";
import {itineraryEmail} from "@/lib/travel-email";
import {validUuid} from "@/lib/quotation-validation";
import {siteConfig} from "@/lib/site-config";
import {revalidatePath} from "next/cache";
export async function sendItinerary(_: {error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}>{
 const {client,user}=await requireAdmin();
 if(process.env.TRAVEL_EMAIL_ENABLED!=="true"||!process.env.RESEND_API_KEY)return {error:"El envío de itinerarios está deshabilitado. Requiere habilitación expresa del propietario."};
 const id=String(form.get("id")??"");if(!validUuid(id)||form.get("approved")!=="si")return {error:"Revise el destinatario y autorice este envío."};
 const [record,travel]=await Promise.all([getAdminReservation(client,id),getTravel(client,id)]);
 if(!record||!travel.data||!travel.data.reviewed||!travel.data.passengers.length)return {error:"Complete y revise el expediente antes de enviar."};
 const r=record.reservation;
 // The email leads to Mi viaje, which signs in with the access surname: without it the customer could not enter.
 if(!r.cliente_apellido?.trim())return {error:"Registre el apellido de acceso a Mi viaje antes de enviar."};
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.cliente_email)||String(form.get("recipient"))!==r.cliente_email)return {error:"El destinatario no coincide con el cliente registrado."};
 let pdf:Buffer,calendar:string|null=null;
 try{pdf=await renderItineraryPdf(r,travel.data,travel.revision);if(expandedDetails(sanitizeDetails(r.accepted_snapshot?.quotation.detalles)).vuelos.journeys.some(j=>j.segmentos.length))calendar=renderTravelCalendar(r,travel.revision);}catch{return {error:"Revise el itinerario y las zonas horarias antes de enviar."};}
 const claim=await client.from("travel_deliveries").insert({reservation_id:id,revision:travel.revision,recipient:r.cliente_email,pdf_base64:pdf.toString("base64"),calendar,created_by:user.id}).select("id").single();
 if(claim.error||!claim.data)return {error:"Esta revisión ya tiene un intento de envío o falta la migración. Revise el historial antes de volver a enviar."};
 const email=itineraryEmail(r,travel.data);
 const attachments=[{filename:`itinerario-${r.codigo}.pdf`,content:pdf.toString("base64")},...(calendar?[{filename:`itinerario-${r.codigo}.ics`,content:Buffer.from(calendar).toString("base64")}]:[])];
 let status="incierto",providerId:string|null=null;
 try{const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,"Content-Type":"application/json","Idempotency-Key":`travel/${claim.data.id}`},body:JSON.stringify({from:siteConfig.supportEmail,to:[r.cliente_email],reply_to:siteConfig.supportEmail,subject:email.subject??`Su itinerario ${r.codigo} | viatour`,text:email.text,html:email.html,attachments}),signal:AbortSignal.timeout(20000)});if(response.ok){const result=await response.json();if(typeof result.id==="string"){providerId=result.id;status="aceptado";}}else if(response.status>=400&&response.status<500)status="fallido";}catch{/* Uncertain provider outcome: never automatically resend. */}
 const saved=await client.from("travel_deliveries").update({status,provider_id:providerId}).eq("id",claim.data.id).eq("status","preparado");
 revalidatePath(`/admin/reservas/${id}`);
 if(saved.error||status!=="aceptado")return {error:"Envío no confirmado. No se reintentará automáticamente; revise el proveedor y el historial."};
 return {success:"El proveedor de correo aceptó el mensaje. Esto no confirma su entrega al destinatario."};
}
