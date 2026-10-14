"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, BedDouble, CarFront, ChevronDown, ChevronUp, CopyPlus, LifeBuoy, MapPinned, Plane, Plus, ShieldCheck, Ship, Ticket, Trash2, type LucideIcon } from "lucide-react";
import { componentTitle, duplicateComponent, emptyComponent, maxPackageComponents, packageServiceKinds, packageServiceLabels, type GeneralService, type PackageComponent, type PackageServiceKind, type QuotationDetails, type ServiceMode } from "@/lib/quotation-details";
import type { FlightJourney } from "@/lib/flight-itinerary";
import type { HotelStay } from "@/lib/quotation-details";
import { FlightSection } from "./flight-section";
import { FareBaggageSection } from "./fare-baggage-section";
import { HotelSection } from "./hotel-section";
import { FerrySection } from "./ferry-section";
import { InclusionsEditor } from "./inclusions-editor";
import { AreaField, IconButton, Notice, Section, Segmented, SmallButton, TextField } from "./fields";
import { cn } from "cn";

type Update = (change: (details: QuotationDetails) => QuotationDetails) => void;
type Props = { details: QuotationDetails; update: Update; recentHotels: HotelStay[]; onApplyItinerary: (journeys: FlightJourney[]) => void };

export const serviceIcons: Record<PackageServiceKind, LucideIcon> = { vuelo: Plane, hotel: BedDouble, ferry: Ship, traslado: CarFront, tour: MapPinned, actividad: Ticket, seguro: ShieldCheck, asistencia: LifeBuoy, otro: Plus };

const inclusionSuggestions: Partial<Record<PackageServiceKind, string[]>> = {
  traslado: ["Equipaje", "Asistencia en el aeropuerto", "Silla para niños", "Espera por retraso del vuelo", "Propinas"],
  tour: ["Transporte", "Guía", "Entradas", "Almuerzo", "Bebidas", "Propinas"],
  actividad: ["Equipo", "Instructor", "Transporte", "Entradas", "Fotos", "Propinas"],
  seguro: ["Gastos médicos", "Equipaje", "Cancelación del viaje", "Asistencia 24 horas"],
  asistencia: ["Gastos médicos", "Asistencia 24 horas", "Equipaje", "Traslado médico"],
  otro: [],
};

// The details the existing V5 sections edit, with this component's data in place of the quotation's
// own flights, hotels or ferry. Sections keep working unchanged; their edits are mapped back below.
function viewOf(details: QuotationDetails, component: PackageComponent): QuotationDetails {
  if (component.vuelo) return { ...details, vuelos: component.vuelo.vuelos, tarifas: component.vuelo.tarifas, equipaje: component.vuelo.equipaje, equipajeConfirmado: component.vuelo.equipajeConfirmado };
  if (component.hotel) return { ...details, hoteles: [component.hotel] };
  if (component.ferry) return { ...details, ferry: component.ferry };
  return details;
}

function withSlice(component: PackageComponent, next: QuotationDetails): PackageComponent {
  if (component.vuelo) return { ...component, vuelo: { vuelos: next.vuelos, tarifas: next.tarifas, equipaje: next.equipaje, equipajeConfirmado: next.equipajeConfirmado } };
  if (component.hotel) return { ...component, hotel: next.hoteles[0] ?? component.hotel };
  if (component.ferry) return { ...component, ferry: next.ferry };
  return component;
}

// An update function for one component's section. Quotation-level fields a section may change (for
// example the separate-tickets clause in the conditions) are kept; the quotation's own flight, hotel and
// ferry fields stay as they were.
function componentUpdate(update: Update, id: string): Update {
  return change => update(current => {
    const component = current.paquete.componentes.find(item => item.id === id);
    if (!component) return current;
    const next = change(viewOf(current, component));
    return {
      ...next, vuelos: current.vuelos, tarifas: current.tarifas, equipaje: current.equipaje, equipajeConfirmado: current.equipajeConfirmado, hoteles: current.hoteles, ferry: current.ferry,
      paquete: { ...current.paquete, componentes: current.paquete.componentes.map(item => item.id === id ? withSlice(item, next) : item) },
    };
  });
}

function ServiceEditor({ component, onChange, sectionId }: { component: PackageComponent; onChange: (service: GeneralService, titulo?: string, notas?: string) => void; sectionId: string }) {
  const service = component.servicio!;
  const set = <K extends keyof GeneralService>(field: K, value: GeneralService[K]) => onChange({ ...service, [field]: value });
  const coverage = component.tipo === "seguro" || component.tipo === "asistencia";
  const transfer = component.tipo === "traslado";
  return <Section id={sectionId} title={packageServiceLabels[component.tipo]} description={coverage ? "Indique solo coberturas y condiciones confirmadas con la aseguradora o el proveedor." : "Describa el servicio tal como lo verá el cliente y marque lo que incluye."}>
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Descripción del servicio *" value={service.descripcion} onChange={value => set("descripcion", value.slice(0, 400))} className="sm:col-span-2"
        placeholder={transfer ? "Traslado aeropuerto – hotel – aeropuerto" : coverage ? "Seguro de viaje con asistencia médica" : "Tour a Chichén Itzá con almuerzo"} />
      <TextField label={coverage ? "Aseguradora o proveedor" : "Operador"} value={service.operador} onChange={value => set("operador", value.slice(0, 120))} hint="Opcional; aparece en el PDF" />
      {!coverage ? <Segmented<ServiceMode> label="Modalidad" value={service.modalidad} onChange={value => set("modalidad", value)} options={[["compartido", "Compartido"], ["privado", "Privado"]]} /> : <div />}
      <TextField label={coverage ? "Vigencia desde" : "Fecha"} type="date" value={service.fecha} onChange={value => set("fecha", value)} />
      {coverage ? <TextField label="Vigencia hasta" type="date" value={service.fechaFin} onChange={value => set("fechaFin", value)} /> : <TextField label={transfer ? "Hora de recogida" : "Hora de inicio"} type="time" value={service.hora} onChange={value => set("hora", value)} hint="Opcional" />}
      {!coverage ? <TextField label={transfer ? "Lugar de recogida" : "Punto de encuentro"} value={service.lugar} onChange={value => set("lugar", value.slice(0, 200))} hint="Opcional" /> : null}
      {!coverage ? <TextField label="Duración" value={service.duracion} onChange={value => set("duracion", value.slice(0, 80))} placeholder={transfer ? "45 minutos aproximadamente" : "Día completo"} hint="Opcional" /> : null}
      <div className="sm:col-span-2"><InclusionsEditor title={`¿Qué incluye ${transfer ? "el traslado" : coverage ? "la cobertura" : "el servicio"}?`} items={service.inclusiones} confirmed={service.inclusionesConfirmadas} suggestions={inclusionSuggestions[component.tipo] ?? []} onChange={(inclusiones, inclusionesConfirmadas) => onChange({ ...service, inclusiones, inclusionesConfirmadas })} /></div>
      <AreaField label="Política de cancelación" value={service.cancelacion} onChange={value => set("cancelacion", value.slice(0, 800))} rows={2} className="sm:col-span-2" hint="Opcional. Solo condiciones confirmadas con el proveedor." />
    </div>
  </Section>;
}

function Presentation({ component, onChange }: { component: PackageComponent; onChange: (change: Partial<PackageComponent>) => void }) {
  return <div className="grid gap-3 rounded-card border border-line bg-canvas p-3 sm:grid-cols-2 sm:p-4">
    <TextField label="Título en el PDF" value={component.titulo} onChange={value => onChange({ titulo: value.slice(0, 160) })} placeholder={componentTitle({ ...component, titulo: "" })} hint="Opcional; si lo deja vacío se usa el que se muestra" />
    <AreaField label="Notas para el cliente sobre este servicio" value={component.notas} onChange={value => onChange({ notas: value.slice(0, 1000) })} rows={2} hint="Opcional; aparecen debajo del servicio en el PDF" />
  </div>;
}

export function PackageSection({ details, update, recentHotels, onApplyItinerary }: Props) {
  const { componentes, nombre } = details.paquete;
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const setComponents = (change: (list: PackageComponent[]) => PackageComponent[]) => update(current => ({ ...current, paquete: { ...current.paquete, componentes: change(current.paquete.componentes) } }));
  const patch = (id: string, change: Partial<PackageComponent>) => setComponents(list => list.map(item => item.id === id ? { ...item, ...change } : item));
  const move = (index: number, direction: -1 | 1) => setComponents(list => { const next = [...list]; const target = index + direction; if (target < 0 || target >= next.length) return list; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const add = (tipo: PackageServiceKind) => {
    const component = emptyComponent(tipo);
    setComponents(list => list.length >= maxPackageComponents ? list : [...list, component]);
    window.setTimeout(() => document.getElementById(`servicio-${component.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const toggle = (id: string) => setCollapsed(list => list.includes(id) ? list.filter(item => item !== id) : [...list, id]);
  const full = componentes.length >= maxPackageComponents;

  return <>
    <Section id="paquete" title="Servicios del paquete" description="Agregue los servicios en el orden en que el cliente los usará. Cada servicio conserva sus propios datos, fechas, inclusiones y condiciones.">
      <div className="space-y-4">
        <TextField label="Nombre del paquete" value={nombre} onChange={value => update(current => ({ ...current, paquete: { ...current.paquete, nombre: value.slice(0, 160) } }))} placeholder="Vacaciones en Cancún" hint="Aparece en el PDF; el destino se indica arriba" />
        <div>
          <p className="mb-2 t-small font-semibold text-ink">Agregar servicio</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Agregar servicio al paquete">{packageServiceKinds.map(tipo => { const Icon = serviceIcons[tipo]; return <SmallButton key={tipo} disabled={full} onClick={() => add(tipo)}><Icon size={16} strokeWidth={2} aria-hidden="true" />{packageServiceLabels[tipo]}</SmallButton>; })}</div>
          {full ? <p className="mt-2 t-small text-ink-soft">El paquete admite hasta {maxPackageComponents} servicios.</p> : null}
        </div>
        {componentes.length ? <ol className="space-y-2" aria-label="Orden de los servicios">{componentes.map((component, index) => {
          const Icon = serviceIcons[component.tipo];
          return <li key={component.id} className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-canvas p-2 pl-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-btn bg-brand-tint text-brand-deep" aria-hidden="true"><Icon size={16} strokeWidth={2} /></span>
            <a href={`#servicio-${component.id}`} className="min-w-0 flex-1 basis-40 text-ink hover:text-brand"><span className="block t-small text-ink-soft">{index + 1}. {packageServiceLabels[component.tipo]}</span><span className="block truncate font-semibold">{componentTitle(component)}</span></a>
            <span className="flex gap-1">
              <IconButton label={`Subir ${componentTitle(component)}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} strokeWidth={2} /></IconButton>
              <IconButton label={`Bajar ${componentTitle(component)}`} disabled={index === componentes.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} strokeWidth={2} /></IconButton>
              <IconButton label={`Duplicar ${componentTitle(component)}`} disabled={full} onClick={() => setComponents(list => { const position = list.findIndex(item => item.id === component.id); const next = [...list]; next.splice(position + 1, 0, duplicateComponent(component)); return next; })}><CopyPlus size={16} strokeWidth={2} /></IconButton>
              {removing === component.id ? <><SmallButton tone="danger" onClick={() => { setComponents(list => list.filter(item => item.id !== component.id)); setRemoving(null); }}>Quitar</SmallButton><SmallButton onClick={() => setRemoving(null)}>Cancelar</SmallButton></>
                : <IconButton label={`Quitar ${componentTitle(component)}`} className="text-error" onClick={() => setRemoving(component.id)}><Trash2 size={16} strokeWidth={2} /></IconButton>}
            </span>
          </li>;
        })}</ol> : <Notice>El paquete aún no tiene servicios. Use los botones de arriba; por ejemplo Vuelo, Hotel y Traslado.</Notice>}
      </div>
    </Section>
    {componentes.map((component, index) => {
      const Icon = serviceIcons[component.tipo];
      const open = !collapsed.includes(component.id);
      const sectionUpdate = componentUpdate(update, component.id);
      const view = viewOf(details, component);
      const base = `servicio-${component.id}`;
      return <div key={component.id} id={base} className="scroll-mt-28 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-panel border border-brand/30 bg-brand-tint px-4 py-3">
          <h2 className="flex min-w-0 items-center gap-2 font-semibold text-ink"><Icon size={18} strokeWidth={2} className="shrink-0 text-brand" aria-hidden="true" /><span className="truncate">Servicio {index + 1} · {packageServiceLabels[component.tipo]}: {componentTitle(component)}</span></h2>
          <SmallButton aria-expanded={open} aria-controls={`${base}-body`} onClick={() => toggle(component.id)}>{open ? <ChevronUp size={16} strokeWidth={2} aria-hidden="true" /> : <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />}{open ? "Contraer" : "Mostrar"}</SmallButton>
        </div>
        <div id={`${base}-body`} hidden={!open} className={cn("space-y-4", !open && "hidden")}>
          {component.vuelo ? <><FlightSection details={view} update={sectionUpdate} onApplyItinerary={onApplyItinerary} sectionId={`${base}-vuelos`} /><FareBaggageSection details={view} update={sectionUpdate} sectionId={`${base}-tarifa`} /></> : null}
          {component.hotel ? <HotelSection details={view} update={sectionUpdate} recentHotels={recentHotels} sectionId={`${base}-hotel`} single title="Hotel" /> : null}
          {component.ferry ? <FerrySection details={view} update={sectionUpdate} sectionId={`${base}-ferry`} /> : null}
          {component.servicio ? <ServiceEditor component={component} sectionId={`${base}-servicio`} onChange={servicio => patch(component.id, { servicio })} /> : null}
          <Presentation component={component} onChange={change => patch(component.id, change)} />
        </div>
      </div>;
    })}
  </>;
}
