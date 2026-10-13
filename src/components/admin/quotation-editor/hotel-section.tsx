"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Plus, Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { emptyHotel, emptyRoom, hotelInclusionSuggestions, mealPlans, nights, type HotelPhoto, type HotelRoom, type HotelStay, type QuotationDetails, type Refundability, type TaxState } from "@/lib/quotation-details";
import { AreaField, Field, IconButton, inputClass, Notice, Section, SelectField, SmallButton, TextField } from "./fields";
import { InclusionsEditor } from "./inclusions-editor";

type Props = { details: QuotationDetails; update: (change: (details: QuotationDetails) => QuotationDetails) => void; recentHotels: HotelStay[] };

const bucket = "quotation-media";
const maxSourceBytes = 25 * 1024 * 1024;
const maxSide = 1600;

// Re-encodes in the browser: applies the camera orientation, limits the long side to 1600 px and
// produces a JPEG (the PDF renderer cannot embed WebP or HEIC). Only the resized copy is uploaded.
async function prepareImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("tipo");
  if (file.size > maxSourceBytes) throw new Error("tamaño");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.65]) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 4.5 * 1024 * 1024) return { blob, width, height };
  }
  throw new Error("tamaño");
}

function randomName() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
}

function Photos({ photos, onChange }: { photos: HotelPhoto[]; onChange: (photos: HotelPhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const missing = photos.map(photo => photo.path).filter(path => !urls[path]).join("|");

  useEffect(() => {
    if (!missing) return;
    let active = true;
    createClient().storage.from(bucket).createSignedUrls(missing.split("|"), 3600).then(({ data }) => {
      if (!active || !data) return;
      setUrls(current => ({ ...current, ...Object.fromEntries(data.filter(item => item.signedUrl && item.path).map(item => [item.path as string, item.signedUrl as string])) }));
    });
    return () => { active = false; };
  }, [missing]);

  async function upload(files: File[]) {
    if (!files.length) return;
    setBusy(true); setMessage(null);
    const storage = createClient().storage.from(bucket);
    const added: HotelPhoto[] = [];
    const failed: string[] = [];
    for (const file of files.slice(0, Math.max(0, 12 - photos.length))) {
      try {
        const { blob, width, height } = await prepareImage(file);
        const path = `hotel/${randomName()}.jpg`;
        const { error } = await storage.upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        added.push({ path, leyenda: "", ancho: width, alto: height });
        setUrls(current => ({ ...current, [path]: URL.createObjectURL(blob) }));
      } catch {
        failed.push(file.name);
      }
    }
    if (added.length) onChange([...photos, ...added]);
    if (input.current) input.current.value = "";
    setBusy(false);
    setMessage(failed.length ? { tone: "error", text: `No se pudieron subir: ${failed.join(", ")}. Use imágenes JPG, PNG o WebP de hasta 25 MB. Si es la primera vez, ejecute docs/sql/quotations_v5.sql.` } : { tone: "success", text: added.length === 1 ? "Foto agregada." : `${added.length} fotos agregadas.` });
  }

  const move = (index: number, target: number) => { const list = [...photos]; const [item] = list.splice(index, 1); list.splice(target, 0, item); onChange(list); };
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" id="hotel-photo-input" onChange={event => upload(Array.from(event.target.files ?? []))} />
      <SmallButton disabled={busy || photos.length >= 12} onClick={() => input.current?.click()}><ImagePlus size={16} strokeWidth={2} aria-hidden="true" />{busy ? "Subiendo fotos" : "Agregar fotos"}</SmallButton>
      <p className="t-small text-ink-soft">Use solo fotos propias o autorizadas por el hotel. La primera es la principal del PDF.</p>
    </div>
    {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    {photos.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo, index) => <li key={photo.path} className="space-y-2 rounded-card border border-line bg-canvas p-2">
      <div className="relative aspect-[3/2] overflow-hidden rounded-btn bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URLs of a private bucket cannot go through the image optimizer */}
        {urls[photo.path] ? <img src={urls[photo.path]} alt={photo.leyenda || `Foto ${index + 1} del hotel`} className="size-full object-cover" /> : null}
        {index === 0 ? <span className="absolute left-2 top-2 rounded-btn bg-brand px-2 py-0.5 text-[12px] font-semibold text-white">Principal</span> : null}
      </div>
      <input aria-label={`Leyenda de la foto ${index + 1}`} className={inputClass} placeholder="Leyenda (opcional)" maxLength={140} value={photo.leyenda} onChange={event => onChange(photos.map(item => item.path === photo.path ? { ...item, leyenda: event.target.value } : item))} />
      <div className="flex flex-wrap gap-1.5">
        {index > 0 ? <IconButton label={`Usar la foto ${index + 1} como principal`} onClick={() => move(index, 0)}><Star size={16} strokeWidth={2} /></IconButton> : null}
        <IconButton label={`Mover la foto ${index + 1} antes`} disabled={index === 0} onClick={() => move(index, index - 1)}><ArrowLeft size={16} strokeWidth={2} /></IconButton>
        <IconButton label={`Mover la foto ${index + 1} después`} disabled={index === photos.length - 1} onClick={() => move(index, index + 1)}><ArrowRight size={16} strokeWidth={2} /></IconButton>
        <IconButton label={`Quitar la foto ${index + 1}`} className="text-error" onClick={() => onChange(photos.filter(item => item.path !== photo.path))}><Trash2 size={16} strokeWidth={2} /></IconButton>
      </div>
    </li>)}</ul> : null}
  </div>;
}

function RoomEditor({ room, index, onChange, onRemove, removable }: { room: HotelRoom; index: number; onChange: (room: HotelRoom) => void; onRemove: () => void; removable: boolean }) {
  const count = (value: string, max: number) => Math.min(max, Number(value.replace(/\D/g, "")) || 0);
  return <div className="grid gap-3 rounded-card border border-line bg-canvas p-3 sm:grid-cols-2 lg:grid-cols-6">
    <TextField label={`Habitación ${index + 1}`} value={room.categoria} onChange={value => onChange({ ...room, categoria: value.slice(0, 120) })} placeholder="Deluxe vista al mar" className="lg:col-span-2" />
    <TextField label="Camas" value={room.camas} onChange={value => onChange({ ...room, camas: value.slice(0, 120) })} placeholder="1 cama king" className="lg:col-span-2" />
    <TextField label="Cantidad" inputMode="numeric" value={String(room.cantidad)} onChange={value => onChange({ ...room, cantidad: Math.max(1, count(value, 50)) })} />
    <div className="flex items-end">{removable ? <SmallButton tone="danger" onClick={onRemove}><Trash2 size={16} strokeWidth={2} aria-hidden="true" />Quitar</SmallButton> : null}</div>
    <TextField label="Adultos" inputMode="numeric" value={String(room.adultos)} onChange={value => onChange({ ...room, adultos: count(value, 20) })} />
    <TextField label="Niños" inputMode="numeric" value={String(room.ninos)} onChange={value => onChange({ ...room, ninos: count(value, 20) })} />
    {room.ninos ? <TextField label="Edades de los niños" value={room.edadesNinos} onChange={value => onChange({ ...room, edadesNinos: value.slice(0, 60) })} placeholder="4 y 8 años" className="lg:col-span-2" /> : null}
  </div>;
}

function HotelEditor({ hotel, index, onChange, onRemove, removable, recentHotels }: { hotel: HotelStay; index: number; onChange: (hotel: HotelStay) => void; onRemove: () => void; removable: boolean; recentHotels: HotelStay[] }) {
  const set = <K extends keyof HotelStay>(field: K, value: HotelStay[K]) => onChange({ ...hotel, [field]: value });
  const stay = nights(hotel.checkIn, hotel.checkOut);
  const recent = recentHotels.find(item => item.nombre.trim().toLowerCase() === hotel.nombre.trim().toLowerCase() && item.id !== hotel.id);
  return <div className="space-y-4 rounded-card border border-line p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ink">Hotel {index + 1}{hotel.nombre ? `: ${hotel.nombre}` : ""}</h3>{removable ? <SmallButton tone="danger" onClick={onRemove}><Trash2 size={16} strokeWidth={2} aria-hidden="true" />Quitar hotel</SmallButton> : null}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre del hotel">{id => <><input id={id} list="recent-hotels" className={inputClass} value={hotel.nombre} maxLength={160} onChange={event => set("nombre", event.target.value)} /><datalist id="recent-hotels">{recentHotels.map(item => <option key={item.id} value={item.nombre} />)}</datalist></>}</Field>
      <TextField label="Destino" value={hotel.destino} onChange={value => set("destino", value)} maxLength={160} placeholder="Cancún, México" />
      {recent ? <div className="sm:col-span-2"><Notice>Este hotel aparece en una cotización anterior. <button type="button" className="font-semibold text-brand underline underline-offset-4" onClick={() => onChange({ ...hotel, destino: hotel.destino || recent.destino, direccion: recent.direccion, amenidades: recent.amenidades, inclusiones: recent.inclusiones.map(item => ({ ...item })), inclusionesConfirmadas: false, planComidas: hotel.planComidas || recent.planComidas, impuestos: recent.impuestos, cargoResort: recent.cargoResort, fotos: recent.fotos })}>Usar su dirección, servicios y fotos</button>. Fechas, habitaciones y condiciones no se copian.</Notice></div> : null}
      <TextField label="Dirección o zona" value={hotel.direccion} onChange={value => set("direccion", value)} maxLength={300} className="sm:col-span-2" />
      <TextField label="Entrada (check-in)" type="date" value={hotel.checkIn} onChange={value => set("checkIn", value)} />
      <TextField label="Salida (check-out)" type="date" value={hotel.checkOut} onChange={value => set("checkOut", value)} hint={stay ? `${stay} ${stay === 1 ? "noche" : "noches"}` : hotel.checkIn && hotel.checkOut ? "La salida debe ser posterior a la entrada." : undefined} />
    </div>
    <div className="space-y-2">
      {hotel.habitaciones.map((room, roomIndex) => <RoomEditor key={room.id} room={room} index={roomIndex} removable={hotel.habitaciones.length > 1} onChange={next => set("habitaciones", hotel.habitaciones.map(item => item.id === room.id ? next : item))} onRemove={() => set("habitaciones", hotel.habitaciones.filter(item => item.id !== room.id))} />)}
      <SmallButton onClick={() => set("habitaciones", [...hotel.habitaciones, emptyRoom()])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar habitación</SmallButton>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Plan de comidas">{id => <><input id={id} list="meal-plans" className={inputClass} value={hotel.planComidas} maxLength={80} onChange={event => set("planComidas", event.target.value)} /><datalist id="meal-plans">{mealPlans.map(plan => <option key={plan} value={plan} />)}</datalist></>}</Field>
      <SelectField<TaxState> label="Impuestos del hotel" value={hotel.impuestos} onChange={value => set("impuestos", value)} options={[["incluidos", "Incluidos"], ["no_incluidos", "No incluidos"], ["parcial", "Incluidos parcialmente"]]} placeholder="Sin indicar" />
      <TextField label="Cargos que se pagan en el hotel" value={hotel.cargoResort} onChange={value => set("cargoResort", value)} maxLength={300} placeholder="Cargo de resort de USD 25 por noche" hint="Opcional" />
      <SelectField<Refundability> label="Reembolso" value={hotel.reembolso} onChange={value => set("reembolso", value)} options={[["reembolsable", "Reembolsable"], ["parcial", "Reembolso parcial"], ["no_reembolsable", "No reembolsable"]]} placeholder="Sin indicar" />
      <div className="sm:col-span-2"><InclusionsEditor title="¿Qué incluye su estadía?" items={hotel.inclusiones} confirmed={hotel.inclusionesConfirmadas} suggestions={hotelInclusionSuggestions} onChange={(inclusiones, inclusionesConfirmadas) => onChange({ ...hotel, inclusiones, inclusionesConfirmadas })} /></div>
      {hotel.amenidades ? <AreaField label="Servicios en texto libre (cotizaciones anteriores)" value={hotel.amenidades} onChange={value => set("amenidades", value.slice(0, 1500))} rows={3} className="sm:col-span-2" hint="Se muestran en el PDF solo si la lista de arriba está vacía. Páselos a la lista para indicar si están incluidos." /> : null}
      <AreaField label="Política de cancelación" value={hotel.cancelacion} onChange={value => set("cancelacion", value.slice(0, 1000))} rows={2} className="sm:col-span-2" />
      <AreaField label="Condiciones especiales" value={hotel.condiciones} onChange={value => set("condiciones", value.slice(0, 1500))} rows={2} className="sm:col-span-2" hint="Opcional: depósito de garantía, edad mínima, horarios de llegada" />
    </div>
    <Photos photos={hotel.fotos} onChange={fotos => set("fotos", fotos)} />
  </div>;
}

export function HotelSection({ details, update, recentHotels }: Props) {
  const hotels = details.hoteles;
  const setHotels = (next: HotelStay[]) => update(current => ({ ...current, hoteles: next }));
  return <Section id="hotel" title={hotels.length > 1 ? "Alojamiento" : "Hotel"} description="Datos del hotel, habitaciones, plan, condiciones y fotos." actions={<SmallButton onClick={() => setHotels([...hotels, emptyHotel()])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar hotel</SmallButton>}>
    <div className="space-y-4">
      {hotels.map((hotel, index) => <HotelEditor key={hotel.id} hotel={hotel} index={index} removable={hotels.length > 1} recentHotels={recentHotels} onChange={next => setHotels(hotels.map(item => item.id === hotel.id ? next : item))} onRemove={() => setHotels(hotels.filter(item => item.id !== hotel.id))} />)}
      {!hotels.length ? <Notice>Agregue el hotel que desea cotizar.</Notice> : null}
    </div>
  </Section>;
}
