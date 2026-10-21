import { expandedDetails,sanitizeDetails } from "@/lib/quotation-details";
import { airportInfo,zoneOffsetMinutes } from "@/lib/flight-reference";
import type { Reservation } from "@/lib/reservation-types";
function escape(value:string){return value.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");}
function stamp(value:Date){return value.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");}
export function flightInstant(date:string,time:string,zone:string){
 const offset=zoneOffsetMinutes(zone,date,time);
 if(offset===null||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error("Revise las fechas y zonas horarias antes de descargar el calendario.");
 const guess=Date.parse(`${date}T${time}:00Z`)-offset*60000;
 const format=(instant:number)=>new Intl.DateTimeFormat("sv-SE",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(instant));
 const candidates=[guess-3600000,guess,guess+3600000].filter(i=>format(i)===`${date} ${time}`);
 if(candidates.length!==1)throw Error("Horario inexistente o ambiguo por cambio de zona. Solicite revisión del asesor.");
 return new Date(candidates[0]);
}
// Fold UTF-8 lines at 75 octets, without splitting a multibyte character (RFC 5545).
function fold(line:string){let result="",part="";for(const char of line){if(Buffer.byteLength(part+char)>75){result+=part+"\r\n";part=" ";}part+=char;}return result+part;}
export function renderTravelCalendar(r:Reservation,revision:number,now=new Date()){
 const flights=expandedDetails(sanitizeDetails(r.accepted_snapshot?.quotation?.detalles)).vuelos.journeys.flatMap(j=>j.segmentos);
 if(!flights.length)throw Error("Esta reserva no contiene vuelos para el calendario.");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//viatour//Itinerario//ES","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
 for(const f of flights){const origin=airportInfo(f.origen),destination=airportInfo(f.destino);if(!origin||!destination)throw Error("Falta verificar la zona horaria del aeropuerto.");const start=flightInstant(f.salidaFecha,f.salidaHora,origin.zona),end=flightInstant(f.llegadaFecha,f.llegadaHora,destination.zona);if(end<=start)throw Error("Revise las horas de llegada y salida.");lines.push("BEGIN:VEVENT",`UID:${escape(r.id)}-${escape(f.id)}@miviatour.com`,`SEQUENCE:${revision}`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(end)}`,`STATUS:${r.estado==="cancelada"?"CANCELLED":"TENTATIVE"}`,`SUMMARY:${escape(`${f.aerolinea} ${f.vuelo}: ${f.origen} → ${f.destino}`)}`,`LOCATION:${escape(origin.nombre)}`,`DESCRIPTION:${escape(`Referencia de agencia ${r.codigo}. Salida local ${f.salidaFecha} ${f.salidaHora} (${origin.zona}); llegada local ${f.llegadaFecha} ${f.llegadaHora} (${destination.zona}). Consulte el estado actualizado en el portal.`)}`,"URL:https://www.miviatour.com/mi-reserva","END:VEVENT");}
 return lines.concat("END:VCALENDAR","").map(fold).join("\r\n");
}
