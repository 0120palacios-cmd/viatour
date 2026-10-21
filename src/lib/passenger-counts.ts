import type { TravelOperations } from "@/lib/travel-operations";
export function validatePassengerCounts(travel:TravelOperations,details:unknown){
 const expected=(details as {pasajeros?:Record<string,unknown>}|null)?.pasajeros;
 const complete=travel.reviewed||travel.status!=="pendiente";
 const fields={adulto:"adultos",nino:"ninos",infante:"infantes"} as const;
 if(!expected||Object.values(fields).some(k=>!Number.isInteger(expected[k])||Number(expected[k])<0||Number(expected[k])>99)){
  if(complete)throw Error("La versión aceptada no tiene cantidades de pasajeros verificables. Revise su documentación antes de confirmar el expediente.");
  return;
 }
 for(const [category,key] of Object.entries(fields)){
  const count=travel.passengers.filter(p=>p.category===category).length;
  if(count>Number(expected[key])||(complete&&count!==expected[key]))throw Error(`Los pasajeros deben coincidir con la versión aceptada: ${expected.adultos} adultos, ${expected.ninos} niños y ${expected.infantes} infantes. Puede guardar un borrador incompleto.`);
 }
 if(complete&&!travel.passengers.length)throw Error("Complete los pasajeros antes de revisar el expediente.");
}
