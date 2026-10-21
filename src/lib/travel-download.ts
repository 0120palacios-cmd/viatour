import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminReservation } from "@/lib/reservation-data";
import { getTravel } from "@/lib/travel-data";
import { renderItineraryPdf } from "@/lib/itinerary-pdf";
import { renderTravelCalendar } from "@/lib/travel-calendar";
export async function travelDownload(client:SupabaseClient,id:string,calendar:boolean,customer=false,inline=false){
 const headers={"Cache-Control":"private, no-store"};
 const [record,travel]=await Promise.all([getAdminReservation(client,id),getTravel(client,id)]);
 if(!record||!travel.data||(customer&&!travel.data.reviewed))return new Response("Itinerario no disponible.",{status:404,headers});
 try{const body=calendar?renderTravelCalendar(record.reservation,travel.revision):await renderItineraryPdf(record.reservation,travel.data,travel.revision);return new Response(body as BodyInit,{headers:{...headers,"Content-Type":calendar?"text/calendar; charset=utf-8":"application/pdf","Content-Disposition":`${inline&&!calendar?"inline":"attachment"}; filename="itinerario-${record.reservation.codigo}.${calendar?"ics":"pdf"}"`}});}catch{return new Response("El itinerario requiere revisión de fechas, zonas horarias o servicios. Consulte con su asesor.",{status:409,headers});}
}
