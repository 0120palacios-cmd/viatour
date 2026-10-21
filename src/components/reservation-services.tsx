import { travelServices } from "@/lib/travel-services";
import { FlightTimeline } from "@/components/flight-timeline";
import { sanitizeDetails, componentTitle } from "@/lib/quotation-details";
import { passengerSummary } from "@/lib/quotation-text";

// Whitelist customer-facing fields; never render raw snapshot JSON or internal notes.
export function ReservationServices({ value }: { value: unknown }) {
  const original = sanitizeDetails(value);
  const details = travelServices(value);
  return <div className="space-y-4">
    <p className="t-small text-ink-soft">Pasajeros: {passengerSummary(details)}</p>
    {original.paquete.componentes.length ? <ul className="list-inside list-disc">{original.paquete.componentes.map(component => <li key={component.id}>{componentTitle(component)}</li>)}</ul> : null}
    <FlightTimeline journeys={details.vuelos.journeys}/>
    {details.equipaje.map(b=><div key={b.id} className="rounded-card bg-surface p-4"><h3 className="font-semibold">Equipaje · {b.alcance}</h3>{([['personal','Artículo personal'],['mano','Equipaje de mano'],['documentado','Equipaje documentado']] as const).map(([key,label])=><p key={key} className="t-small mt-2">{label}: {({incluido:'Incluido',no_incluido:'No incluido',con_cargo:'Con cargo','':'Por confirmar'})[b[key].estado]} {b[key].piezas??''} {b[key].peso} {b[key].medidas}</p>)}<p className="t-small mt-2 text-ink-soft">{b.notas} {b.adicional}</p></div>)}
    {details.hoteles.map(hotel => <div key={hotel.id} className="rounded-card border border-line p-4"><h3 className="font-semibold">{hotel.nombre}</h3><p>{hotel.destino} · {hotel.checkIn} — {hotel.checkOut}</p><p className="t-small">{hotel.planComidas}</p>{hotel.habitaciones.map(room => <p key={room.id} className="t-small">{room.cantidad} × {room.categoria} · {room.adultos} adultos · {room.ninos} niños</p>)}</div>)}
    {details.ferry.legs.map(leg => <p key={leg.id} className="t-small">Ferry · {leg.operador} · {leg.origenPuerto} → {leg.destinoPuerto} · {leg.salidaFecha} {leg.salidaHora}</p>)}
    {details.servicios.map(service => <p key={service.id} className="t-small">{service.tipo}: {service.descripcion}</p>)}
  </div>;
}
