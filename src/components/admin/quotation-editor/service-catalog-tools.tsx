"use client";

import { useState, useTransition } from "react";
import { BookmarkPlus } from "lucide-react";
import { saveServiceFromQuotation } from "@/app/admin/catalogos/actions";
import { Combobox } from "@/components/admin/combobox";
import { applyCatalogFerry, applyCatalogService, serviceCatalogLabels, type ServiceCatalogEntry, type ServiceCatalogKind } from "@/lib/service-catalog";
import type { FerryDetails, GeneralService, PackageComponent } from "@/lib/quotation-details";
import { useCatalogs } from "./catalog-context";
import { Notice, SmallButton } from "./fields";

type Message = { tone: "error" | "success" | "info"; text: string } | null;

function optionsFor(entries: ServiceCatalogEntry[]) {
  return entries.map(entry => ({ id: entry.id, label: entry.nombre, detail: [entry.operador, entry.destino, entry.duracion].filter(Boolean).join(" · ") }));
}

// Search and fill a transfer, tour, activity, insurance… from the service catalog, or save the one typed
// here to it. Filling copies the data into this quotation; the catalog record never changes here.
export function ServiceCatalogTools({ component, onChange }: { component: PackageComponent; onChange: (service: GeneralService) => void }) {
  const catalogs = useCatalogs();
  const [message, setMessage] = useState<Message>(null);
  const [saving, startSaving] = useTransition();
  const service = component.servicio;
  if (!catalogs.servicesReady || !service) return null;
  const tipo = component.tipo as ServiceCatalogKind;
  const entries = (catalogs.services ?? []).filter(entry => entry.tipo === tipo);
  const label = serviceCatalogLabels[tipo] ?? "Servicio";
  const pick = (id: string) => {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    onChange(applyCatalogService(service, entry));
    setMessage({ tone: "info", text: `Se copiaron los datos de ${entry.nombre}. Indique fecha y hora, y confirme lo que incluye este servicio.` });
  };
  const save = () => startSaving(async () => {
    const result = await saveServiceFromQuotation(JSON.stringify(component));
    setMessage(result.error ? { tone: "error", text: result.error } : { tone: "success", text: result.success ?? "Guardado en el catálogo." });
  });
  return <div className="space-y-2 sm:col-span-2">
    <div className="flex flex-wrap items-end gap-2">
      <Combobox className="min-w-60 flex-1" label={`Buscar en el catálogo (${label.toLowerCase()})`} options={optionsFor(entries)} onSelect={option => pick(option.id)} placeholder="Nombre, operador o destino" emptyText={entries.length ? "Ningún servicio coincide." : "Aún no hay servicios de este tipo en el catálogo."} />
      {service.descripcion.trim() ? <SmallButton disabled={saving} onClick={save}><BookmarkPlus size={16} strokeWidth={2} aria-hidden="true" />{saving ? "Guardando" : "Guardar en el catálogo"}</SmallButton> : null}
    </div>
    {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
  </div>;
}

// The same for a ferry: a shipping line's standing conditions (baggage, changes, cancellation, boarding,
// documents). Legs, dates and class stay the advisor's; everything copied must be confirmed again.
export function FerryCatalogTools({ ferry, onChange }: { ferry: FerryDetails; onChange: (ferry: FerryDetails) => void }) {
  const catalogs = useCatalogs();
  const [message, setMessage] = useState<Message>(null);
  const [saving, startSaving] = useTransition();
  if (!catalogs.servicesReady) return null;
  const entries = (catalogs.services ?? []).filter(entry => entry.tipo === "ferry");
  const operator = ferry.legs.find(leg => leg.operador.trim())?.operador ?? "";
  const pick = (id: string) => {
    const entry = entries.find(item => item.id === id);
    if (!entry) return;
    onChange(applyCatalogFerry(ferry, entry));
    setMessage({ tone: "info", text: `Se copiaron las condiciones de ${entry.nombre}. Revise trayectos y horarios, y confirme las condiciones y lo que incluye.` });
  };
  const save = () => startSaving(async () => {
    const result = await saveServiceFromQuotation(JSON.stringify({ tipo: "ferry", titulo: operator, ferry }));
    setMessage(result.error ? { tone: "error", text: result.error } : { tone: "success", text: result.success ?? "Guardado en el catálogo." });
  });
  return <div className="space-y-2">
    <div className="flex flex-wrap items-end gap-2">
      <Combobox className="min-w-60 flex-1" label="Buscar naviera en el catálogo" options={optionsFor(entries)} onSelect={option => pick(option.id)} placeholder="Naviera, barco o destino" emptyText={entries.length ? "Ninguna naviera coincide." : "Aún no hay navieras en el catálogo."} />
      {operator ? <SmallButton disabled={saving} onClick={save}><BookmarkPlus size={16} strokeWidth={2} aria-hidden="true" />{saving ? "Guardando" : "Guardar naviera en el catálogo"}</SmallButton> : null}
    </div>
    {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
  </div>;
}
