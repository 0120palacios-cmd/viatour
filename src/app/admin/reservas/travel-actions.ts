"use server";
import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { validateTravel,publicTravel,ticketingLabels } from "@/lib/travel-operations";
import { sealTravel } from "@/lib/travel-vault";
import { getTravel } from "@/lib/travel-data";
import { emptyPassenger } from "@/lib/travel-operations";
import { travelServices } from "@/lib/travel-services";
import { revalidatePath } from "next/cache";
import { validatePassengerCounts } from "@/lib/passenger-counts";

export type TravelState={error?:string;success?:string;revision?:number};
const issuanceRank={pendiente:0,en_emision:1,emitida:2} as const;
export async function purgePrivateTravel(_:TravelState,form:FormData):Promise<TravelState>{
 const {client}=await requireAdmin();const id=String(form.get("id")??"");
 if(!validUuid(id)||form.get("confirm")!=="si")return {error:"Confirme la eliminación de los datos privados."};
 const travel=await getTravel(client,id,true);
 if(!travel.privateData)return {error:"Expediente no disponible o clave de cifrado no configurada."};
 const data={...travel.privateData,passengers:travel.privateData.passengers.map(p=>({...emptyPassenger(p.id),firstName:p.firstName,middleName:p.middleName,lastName:p.lastName,category:p.category}))};
 const result=await client.rpc("purge_reservation_travel_private",{p_id:id,p_revision:travel.revision,p_encrypted:sealTravel(data,id)});
 if(result.error)return {error:"No se eliminaron los datos. Recargue y revise la migración."};
 revalidatePath(`/admin/reservas/${id}`);return {success:"Datos privados eliminados del expediente activo."};
}
export async function createReceipt(_:TravelState,form:FormData):Promise<TravelState>{
 const {client}=await requireAdmin();const id=String(form.get("payment_id")??"");
 if(!validUuid(id))return {error:"Pago inválido."};
 const result=await client.rpc("create_payment_receipt",{p_payment:id});
 if(result.error)return {error:"No se pudo generar el recibo. Verifique el pago, su moneda y la migración."};
 revalidatePath("/admin/reservas","layout");revalidatePath("/mi-reserva");return {success:"Recibo disponible en la sección Recibos."};
}
export async function saveTravel(_:TravelState,form:FormData):Promise<TravelState>{
 const {client}=await requireAdmin();
 const id=String(form.get("id")??""),revision=Number(form.get("revision"));
 if(!validUuid(id)||!Number.isInteger(revision)||revision<0) return {error:"Expediente inválido."};
 const raw=String(form.get("payload")??"");
 if(raw.length>100000) return {error:"El expediente supera el tamaño permitido."};
 const r=await client.from("reservations").select("fecha_inicio,estado,accepted_snapshot").eq("id",id).maybeSingle();
 if(r.error||!r.data) return {error:"Reserva no disponible."};
 let data,encrypted;
 try{data=validateTravel(JSON.parse(raw),r.data.fecha_inicio);validatePassengerCounts(data,r.data.accepted_snapshot?.quotation?.detalles);encrypted=sealTravel(data,id);}catch(error){return {error:error instanceof SyntaxError?"Revise el expediente.":error instanceof Error?error.message:"No se pudo proteger el expediente."};}
 if(data.status!=="pendiente"&&!travelServices(r.data.accepted_snapshot?.quotation?.detalles).vuelos.journeys.some(j=>j.segmentos.length))return {error:"Esta reserva no tiene vuelos para emitir."};
 // What the traveller already sees is never taken back from this form: issuance only moves forward and
 // recorded tickets are kept, even when the encrypted copy loaded in the browser was behind.
 const visible=(await getTravel(client,id)).data;
 if(visible&&issuanceRank[data.status]<issuanceRank[visible.status])return {error:`El cliente ya ve «${ticketingLabels[visible.status]}». Este formulario no puede volver a un estado anterior; recargue la página y revise los boletos antes de guardar.`};
 if(visible&&visible.tickets.some(t=>t.number&&!data.tickets.some(n=>n.number===t.number)))return {error:"Faltan boletos que el cliente ya ve en Mi viaje. Recargue la página: se cargarán los boletos registrados."};
 const result=await client.rpc("save_reservation_travel",{p_id:id,p_revision:revision,p_public:publicTravel(data),p_encrypted:encrypted});
 if(result.error) return {error:"No se guardó el expediente. Revise la migración, la confirmación del proveedor y el estado de emisión; si otro asesor lo modificó, recargue la página."};
 revalidatePath(`/admin/reservas/${id}`);revalidatePath("/mi-reserva");
 return {success:"Expediente guardado. No se enviaron documentos ni se emitieron boletos automáticamente.",revision:Number(result.data)};
}
