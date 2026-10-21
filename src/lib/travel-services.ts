import {expandedDetails,sanitizeDetails,componentTitle} from "@/lib/quotation-details";
// Operational projection only: quotation rendering and its V5/V6 expansion remain unchanged.
export function travelServices(value:unknown){
 const original=sanitizeDetails(value),d=expandedDetails(original);
 return {...d,equipaje:[...d.equipaje,...original.paquete.componentes.flatMap(c=>c.vuelo?.equipaje??[])],servicios:[...d.servicios,...original.paquete.componentes.flatMap(c=>c.servicio?[{id:c.id,tipo:componentTitle(c),descripcion:[c.servicio.descripcion,c.servicio.operador,c.servicio.fecha,c.servicio.hora,c.servicio.fechaFin,c.servicio.lugar,c.servicio.duracion,c.servicio.modalidad,...c.servicio.inclusiones.map(x=>`${x.nombre}: ${x.estado==='no_incluido'?'No incluido':x.estado==='con_cargo'?'Con cargo':x.estado==='incluido'?'Incluido':'Por confirmar'} ${x.detalle}`)].filter(Boolean).join(' · ')}]:[]) ]};
}
