"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveServiceEntry, setServiceActive } from "@/app/admin/catalogos/actions";
import { serviceCatalogKinds, serviceCatalogLabels, type ServiceCatalogEntry, type ServiceCatalogKind } from "@/lib/service-catalog";
import { ferryInclusionSuggestions, serviceType, type ServiceMode } from "@/lib/quotation-details";
import { AreaField, Notice, Section, SelectField, TextField } from "@/components/admin/quotation-editor/fields";
import { InclusionsEditor } from "@/components/admin/quotation-editor/inclusions-editor";
import { cn } from "cn";


export function ServiceCatalogForm({ initial }: { initial: ServiceCatalogEntry }) {
  const router = useRouter();
  const [entry, setEntry] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string; conflict?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof ServiceCatalogEntry>(field: K, value: ServiceCatalogEntry[K]) => { setEntry(current => ({ ...current, [field]: value })); setDirty(true); };
  const ferry = entry.tipo === "ferry";
  const variant = ferry ? null : serviceType(entry.tipo).variante;

  const save = () => startSaving(async () => {
    const result = await saveServiceEntry(JSON.stringify(entry));
    if (result.error) { setMessage({ tone: "error", text: result.error, conflict: result.conflict }); return; }
    setEntry(current => ({ ...current, id: result.id ?? current.id, updatedAt: result.updatedAt ?? current.updatedAt }));
    setDirty(false);
    setMessage({ tone: "success", text: result.success ?? "Servicio guardado." });
    if (!entry.id && result.id) router.replace(`/admin/catalogos/servicios/${result.id}`);
  });
  const toggleActive = () => startSaving(async () => {
    const result = await setServiceActive(entry.id, !entry.activo);
    if (result.error) { setMessage({ tone: "error", text: result.error }); return; }
    setEntry(current => ({ ...current, activo: !current.activo, updatedAt: result.updatedAt ?? current.updatedAt }));
    setMessage({ tone: "success", text: result.success ?? "Estado actualizado." });
  });

  return <div className="space-y-6">
    <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <p role="status" aria-live="polite" className={cn("t-small font-semibold", dirty ? "text-ink" : "text-success")}>{saving ? "Guardando" : dirty ? "Cambios sin guardar" : entry.id ? "Guardado" : "Servicio nuevo"}{!entry.activo ? " · Inactivo" : ""}</p>
      <div className="flex flex-wrap gap-2">
        {entry.id ? <Button type="button" variant="ghost" className="min-h-10 px-4" disabled={saving} onClick={toggleActive}>{entry.activo ? "Desactivar" : "Activar"}</Button> : null}
        <Button type="button" className="min-h-10 px-4" disabled={saving} onClick={save}><Save size={17} strokeWidth={2} aria-hidden="true" />{entry.id ? "Guardar" : "Agregar al catálogo"}</Button>
      </div>
    </div>
    {message ? <Notice tone={message.tone}>{message.text}{message.conflict ? <> <button type="button" className="font-semibold underline underline-offset-4" onClick={() => window.location.reload()}>Recargar</button></> : null}</Notice> : null}
    <Notice>Los datos del catálogo son sugerencias para cotizar más rápido. Cada cotización guarda su propia copia y pide confirmar lo que incluye: elegir un servicio no confirma disponibilidad ni tarifa con el proveedor. No registre precios aquí.</Notice>

    <Section id="datos" title={ferry ? "Naviera" : "Datos del servicio"}>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField<ServiceCatalogKind> label="Tipo *" value={entry.tipo} onChange={value => set("tipo", value)} options={serviceCatalogKinds.map(kind => [kind, serviceCatalogLabels[kind]] as const)} hint={entry.id ? "Cambiar el tipo descarta los campos que no aplican." : undefined} />
        <TextField label={ferry ? "Naviera o barco *" : "Nombre *"} value={entry.nombre} onChange={value => set("nombre", value.slice(0, 160))} placeholder={ferry ? "Galaxy Wave" : entry.tipo === "traslado" ? "Aeropuerto de Cancún – zona hotelera" : "Snorkel en West End"} />
        <TextField label={ferry ? "Empresa operadora" : variant === "cobertura" ? "Aseguradora o proveedor" : "Operador"} value={entry.operador} onChange={value => set("operador", value.slice(0, 120))} />
        <TextField label="Destino" value={entry.destino} onChange={value => set("destino", value.slice(0, 160))} placeholder="Roatán" hint="Para encontrarlo al cotizar" />
        {!ferry ? <>
          <AreaField label="Descripción para el cliente" value={entry.descripcion} onChange={value => set("descripcion", value.slice(0, 400))} rows={2} className="sm:col-span-2" hint="Se copia como descripción del servicio en la cotización." />
          {variant !== "cobertura" ? <TextField label={variant === "traslado" ? "Lugar de recogida habitual" : "Punto de encuentro"} value={entry.lugar} onChange={value => set("lugar", value.slice(0, 200))} /> : null}
          {variant !== "cobertura" ? <TextField label="Duración" value={entry.duracion} onChange={value => set("duracion", value.slice(0, 80))} placeholder="4 horas" /> : null}
          {variant === "traslado" || entry.tipo === "tour" ? <SelectField<ServiceMode> label="Modalidad" value={entry.modalidad} onChange={value => set("modalidad", value)} options={[["compartido", "Compartido"], ["privado", "Privado"]]} placeholder="Sin indicar" /> : null}
        </> : null}
      </div>
    </Section>

    {ferry ? <Section id="condiciones" title="Condiciones habituales de la naviera" description="Se copian a cada ferry cotizado con esta naviera y se marcan para confirmar.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Equipaje incluido" value={entry.equipajeIncluido} onChange={value => set("equipajeIncluido", value.slice(0, 300))} />
        <TextField label="Equipaje adicional" value={entry.equipajeAdicional} onChange={value => set("equipajeAdicional", value.slice(0, 300))} />
        <AreaField label="Cambios" value={entry.cambios} onChange={value => set("cambios", value.slice(0, 400))} rows={2} />
        <AreaField label="Embarque" value={entry.embarque} onChange={value => set("embarque", value.slice(0, 400))} rows={2} hint="Anticipación para presentarse, muelle." />
        <AreaField label="Documentos" value={entry.documentos} onChange={value => set("documentos", value.slice(0, 400))} rows={2} className="sm:col-span-2" />
      </div>
    </Section> : null}

    <Section id="incluye" title="Lo que suele incluir">
      <InclusionsEditor title="Valores sugeridos: incluido, no incluido o con cargo" items={entry.inclusiones} confirmed={false} confirmable={false}
        suggestions={ferry ? [...ferryInclusionSuggestions] : [...(serviceType(entry.tipo).sugerencias ?? [])]}
        description="Se copian a cada cotización como punto de partida. El asesor los confirma o cambia para cada viaje." onChange={inclusiones => set("inclusiones", inclusiones)} />
    </Section>

    <Section id="cancelacion" title="Cancelación">
      <AreaField label="Política de cancelación habitual" value={entry.cancelacion} onChange={value => set("cancelacion", value.slice(0, 800))} rows={2} hint="Cada cotización puede cambiarla." />
    </Section>

    <Section id="interno" title="Uso interno" description="Nunca aparece en el PDF ni se comparte con el cliente.">
      <AreaField label="Notas internas" value={entry.notasInternas} onChange={value => set("notasInternas", value.slice(0, 3000))} rows={3} hint="Contacto del proveedor, condiciones negociadas, observaciones." />
    </Section>
  </div>;
}
