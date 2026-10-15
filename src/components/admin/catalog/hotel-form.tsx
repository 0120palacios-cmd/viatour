"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveHotelEntry, setHotelActive } from "@/app/admin/catalogos/actions";
import { hotelAmenitySuggestions, hotelCatalogInclusionSuggestions, type CatalogRoom, type HotelCatalogEntry } from "@/lib/catalog";
import { mealPlans, newId, type TaxState } from "@/lib/quotation-details";
import { AreaField, IconButton, inputClass, Notice, Section, SelectField, SmallButton, TextField } from "@/components/admin/quotation-editor/fields";
import { InclusionsEditor } from "@/components/admin/quotation-editor/inclusions-editor";
import { HotelPhotos } from "@/components/admin/quotation-editor/hotel-section";
import { cn } from "cn";

// A list of short values chosen from suggestions or typed (amenities, meal plans).
function ChipList({ label, values, suggestions, onChange, placeholder }: { label: string; values: string[]; suggestions: string[]; onChange: (values: string[]) => void; placeholder: string }) {
  const [custom, setCustom] = useState("");
  const has = (value: string) => values.some(item => item.toLowerCase() === value.toLowerCase());
  const add = (value: string) => { const clean = value.trim().slice(0, 80); if (clean && !has(clean)) onChange([...values, clean]); };
  return <fieldset className="space-y-2">
    <legend className="mb-1 t-small font-semibold text-ink">{label}</legend>
    {values.length ? <ul className="flex flex-wrap gap-1.5">{values.map(value => <li key={value}><span className="inline-flex min-h-8 items-center gap-1 rounded-btn border border-brand bg-brand-tint pl-2 text-[13px] font-semibold text-brand-deep">{value}<button type="button" aria-label={`Quitar ${value}`} className="inline-flex size-8 items-center justify-center" onClick={() => onChange(values.filter(item => item !== value))}><X size={14} strokeWidth={2} aria-hidden="true" /></button></span></li>)}</ul> : null}
    <div className="flex flex-wrap gap-1.5">{suggestions.filter(item => !has(item)).map(item => <SmallButton key={item} className="min-h-8 px-2 text-[13px]" onClick={() => add(item)}><Plus size={14} strokeWidth={2} aria-hidden="true" />{item}</SmallButton>)}</div>
    <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="sr-only">{placeholder}</span><input className={inputClass} placeholder={placeholder} maxLength={80} value={custom} onChange={event => setCustom(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); add(custom); setCustom(""); } }} /></label><SmallButton disabled={!custom.trim()} onClick={() => { add(custom); setCustom(""); }}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar</SmallButton></div>
  </fieldset>;
}

export function HotelCatalogForm({ initial }: { initial: HotelCatalogEntry }) {
  const router = useRouter();
  const [entry, setEntry] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string; conflict?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof HotelCatalogEntry>(field: K, value: HotelCatalogEntry[K]) => { setEntry(current => ({ ...current, [field]: value })); setDirty(true); };
  const setRoom = (id: string, change: Partial<CatalogRoom>) => set("habitaciones", entry.habitaciones.map(room => room.id === id ? { ...room, ...change } : room));

  const save = () => startSaving(async () => {
    const result = await saveHotelEntry(JSON.stringify(entry));
    if (result.error) { setMessage({ tone: "error", text: result.error, conflict: result.conflict }); return; }
    setEntry(current => ({ ...current, id: result.id ?? current.id, updatedAt: result.updatedAt ?? current.updatedAt }));
    setDirty(false);
    setMessage({ tone: "success", text: result.success ?? "Hotel guardado." });
    if (!entry.id && result.id) router.replace(`/admin/catalogos/hoteles/${result.id}`);
  });
  const toggleActive = () => startSaving(async () => {
    const result = await setHotelActive(entry.id, !entry.activo);
    if (result.error) { setMessage({ tone: "error", text: result.error }); return; }
    setEntry(current => ({ ...current, activo: !current.activo, updatedAt: result.updatedAt ?? current.updatedAt }));
    setMessage({ tone: "success", text: result.success ?? "Estado actualizado." });
  });

  return <div className="space-y-6">
    <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <p role="status" aria-live="polite" className={cn("t-small font-semibold", dirty ? "text-ink" : "text-success")}>{saving ? "Guardando" : dirty ? "Cambios sin guardar" : entry.id ? "Guardado" : "Hotel nuevo"}{!entry.activo ? " · Inactivo" : ""}</p>
      <div className="flex flex-wrap gap-2">
        {entry.id ? <Button type="button" variant="ghost" className="min-h-10 px-4" disabled={saving} onClick={toggleActive}>{entry.activo ? "Desactivar" : "Activar"}</Button> : null}
        <Button type="button" className="min-h-10 px-4" disabled={saving} onClick={save}><Save size={17} strokeWidth={2} aria-hidden="true" />{entry.id ? "Guardar" : "Agregar al catálogo"}</Button>
      </div>
    </div>
    {message ? <Notice tone={message.tone}>{message.text}{message.conflict ? <> <button type="button" className="font-semibold underline underline-offset-4" onClick={() => window.location.reload()}>Recargar</button></> : null}</Notice> : null}
    <Notice>Los datos del catálogo son sugerencias para preparar cotizaciones más rápido. Cada cotización guarda su propia copia y pide confirmar lo que incluye: cambiar este registro no modifica cotizaciones ya preparadas o enviadas. No registre precios aquí.</Notice>

    <Section id="datos" title="Datos del hotel">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Nombre del hotel *" value={entry.nombre} onChange={value => set("nombre", value.slice(0, 160))} />
        <TextField label="Cadena o grupo" value={entry.cadena} onChange={value => set("cadena", value.slice(0, 120))} hint="Opcional" />
        <TextField label="País" value={entry.pais} onChange={value => set("pais", value.slice(0, 80))} />
        <TextField label="Ciudad *" value={entry.ciudad} onChange={value => set("ciudad", value.slice(0, 120))} />
        <TextField label="Destino como aparece en la cotización" value={entry.destino} onChange={value => set("destino", value.slice(0, 160))} placeholder="Cancún, México" hint="Si lo deja vacío se usa ciudad y país" />
        <SelectField<string> label="Categoría verificada" value={entry.estrellas ? String(entry.estrellas) : ""} onChange={value => set("estrellas", value ? Number(value) : null)} options={[1, 2, 3, 4, 5].map(stars => [String(stars), `${stars} ${stars === 1 ? "estrella" : "estrellas"}`] as const)} placeholder="Sin verificar" hint="Indíquela solo si está verificada" />
        <TextField label="Dirección" value={entry.direccion} onChange={value => set("direccion", value.slice(0, 300))} className="sm:col-span-2" />
        <AreaField label="Ubicación y referencias" value={entry.ubicacion} onChange={value => set("ubicacion", value.slice(0, 500))} rows={2} className="sm:col-span-2" hint="Zona, distancia al aeropuerto o a la playa. Opcional." />
        <TextField label="Teléfono" value={entry.telefono} onChange={value => set("telefono", value.slice(0, 60))} />
        <TextField label="Correo de reservas" type="email" value={entry.email} onChange={value => set("email", value.slice(0, 254))} />
        <TextField label="Sitio web" type="url" value={entry.sitioWeb} onChange={value => set("sitioWeb", value.slice(0, 300))} placeholder="https://" hint="Solo direcciones https://" className="sm:col-span-2" />
        <AreaField label="Descripción" value={entry.descripcion} onChange={value => set("descripcion", value.slice(0, 2000))} rows={4} className="sm:col-span-2" hint="Uso interno por ahora; no se imprime en el PDF." />
      </div>
    </Section>

    <Section id="fotos" title="Fotos" description="Se reutilizan al cotizar este hotel. La primera es la principal.">
      <HotelPhotos photos={entry.fotos} onChange={fotos => set("fotos", fotos)} />
    </Section>

    <Section id="habitaciones" title="Habitaciones y planes" actions={<SmallButton onClick={() => set("habitaciones", [...entry.habitaciones, { id: newId(), categoria: "", camas: "", capacidad: "", descripcion: "" }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar habitación</SmallButton>}>
      <div className="space-y-4">
        {entry.habitaciones.length ? <ul className="space-y-2">{entry.habitaciones.map((room, index) => <li key={room.id} className="grid gap-3 rounded-card border border-line bg-canvas p-3 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_auto]">
          <TextField label={`Categoría ${index + 1}`} value={room.categoria} onChange={value => setRoom(room.id, { categoria: value.slice(0, 120) })} placeholder="Deluxe vista al mar" />
          <TextField label="Camas" value={room.camas} onChange={value => setRoom(room.id, { camas: value.slice(0, 120) })} placeholder="1 king o 2 dobles" />
          <TextField label="Capacidad" value={room.capacidad} onChange={value => setRoom(room.id, { capacidad: value.slice(0, 80) })} placeholder="Hasta 4 personas" />
          <div className="flex items-end"><IconButton label={`Quitar habitación ${index + 1}`} className="text-error" onClick={() => set("habitaciones", entry.habitaciones.filter(item => item.id !== room.id))}><Trash2 size={16} strokeWidth={2} /></IconButton></div>
        </li>)}</ul> : <p className="t-small text-ink-soft">Sin categorías registradas. Al cotizar podrá elegirlas con un clic.</p>}
        <ChipList label="Planes de comidas disponibles" values={entry.planes} suggestions={mealPlans} onChange={planes => set("planes", planes.slice(0, 10))} placeholder="Otro plan" />
      </div>
    </Section>

    <Section id="servicios" title="Instalaciones y lo que suele incluir">
      <div className="space-y-4">
        <ChipList label="Instalaciones del hotel" values={entry.amenidades} suggestions={hotelAmenitySuggestions} onChange={amenidades => set("amenidades", amenidades.slice(0, 40))} placeholder="Otra instalación" />
        <p className="t-small text-ink-soft">Las instalaciones son descriptivas: nunca se imprimen como incluidas en una cotización.</p>
        <InclusionsEditor title="Valores sugeridos: incluido, no incluido o con cargo" items={entry.inclusiones} confirmed={false} confirmable={false} suggestions={hotelCatalogInclusionSuggestions}
          description="Se copian a cada cotización de este hotel como punto de partida. El asesor los confirma o cambia para cada reserva." onChange={inclusiones => set("inclusiones", inclusiones)} />
      </div>
    </Section>

    <Section id="politicas" title="Políticas">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Hora de entrada (check-in)" type="time" value={entry.checkIn} onChange={value => set("checkIn", value)} />
        <TextField label="Hora de salida (check-out)" type="time" value={entry.checkOut} onChange={value => set("checkOut", value)} />
        <SelectField<TaxState> label="Impuestos del hotel" value={entry.impuestos} onChange={value => set("impuestos", value)} options={[["incluidos", "Incluidos"], ["no_incluidos", "No incluidos"], ["parcial", "Incluidos parcialmente"]]} placeholder="Sin indicar" />
        <TextField label="Cargos que se pagan en el hotel" value={entry.cargoResort} onChange={value => set("cargoResort", value.slice(0, 300))} placeholder="Cargo de resort por noche" />
        <AreaField label="Políticas generales" value={entry.politicas} onChange={value => set("politicas", value.slice(0, 1500))} rows={3} className="sm:col-span-2" hint="Depósito de garantía, edad mínima, mascotas u otras condiciones." />
        <AreaField label="Política de cancelación habitual" value={entry.cancelacion} onChange={value => set("cancelacion", value.slice(0, 1000))} rows={2} className="sm:col-span-2" hint="Cada cotización puede cambiarla según la tarifa." />
      </div>
    </Section>

    <Section id="interno" title="Uso interno" description="Nunca aparece en el PDF ni se comparte con el cliente.">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Referencia del proveedor" value={entry.referenciaProveedor} onChange={value => set("referenciaProveedor", value.slice(0, 160))} />
        <AreaField label="Notas internas" value={entry.notasInternas} onChange={value => set("notasInternas", value.slice(0, 3000))} rows={3} className="sm:col-span-2" />
      </div>
    </Section>
  </div>;
}
