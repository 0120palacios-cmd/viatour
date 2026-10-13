"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { itemTypes, newId, pricingSummary, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import { lineAmount } from "@/lib/money";
import { formatQuotationAmount, type Currency } from "@/lib/quotation-types";
import { draftItem, itemsAsNumbers, type DraftItem } from "./draft";
import { AreaField, IconButton, inputClass, Section, SelectField, SmallButton, TextField } from "./fields";
import { cn } from "cn";

type Props = {
  kind: QuotationKind; items: DraftItem[]; setItems: (items: DraftItem[]) => void; currency: Currency; setCurrency: (currency: Currency) => void;
  details: QuotationDetails; update: (change: (details: QuotationDetails) => QuotationDetails) => void;
};

const amountPattern = /^\d{0,9}(\.\d{0,2})?$/;
const serviceTypes = ["Traslado", "Tour", "Seguro", "Asistencia", "Alimentación", "Actividad", "Otro"];

export function PricingSection({ kind, items, setItems, currency, setCurrency, details, update }: Props) {
  const summary = pricingSummary(itemsAsNumbers(items), details);
  const money = (value: number) => formatQuotationAmount(value, currency);
  const { adultos, ninos, infantes } = details.pasajeros;
  const travellers = adultos + ninos + infantes;
  const setItem = (key: string, field: keyof DraftItem, value: string) => setItems(items.map(item => item.key === key ? { ...item, [field]: value } : item));
  const add = (descripcion: string, tipo: string, cantidad = 1) => setItems([...items, draftItem(descripcion, tipo, String(cantidad))]);
  const quick: [string, () => void][] = [
    ...(kind === "vuelo" || kind === "paquete" ? [
      ["Tarifa aérea por adulto", () => add("Tarifa aérea — Adulto", "Tarifa aérea", adultos || 1)],
      ...(ninos ? [["Tarifa aérea por niño", () => add("Tarifa aérea — Niño", "Tarifa aérea", ninos)] as [string, () => void]] : []),
      ...(infantes ? [["Tarifa aérea por infante", () => add("Tarifa aérea — Infante", "Tarifa aérea", infantes)] as [string, () => void]] : []),
      ["Impuestos y tasas", () => add("Impuestos y tasas aeroportuarias", "Impuestos y tasas", Math.max(1, adultos + ninos))],
    ] as [string, () => void][] : []),
    ...(kind === "hotel" || kind === "paquete" ? details.hoteles.map(hotel => [`Hotel ${hotel.nombre || ""}`.trim(), () => add(`${hotel.nombre || "Hotel"}`, "Hotel")] as [string, () => void]) : []),
    ...(kind === "ferry" ? [
      ["Pasaje ferry por adulto", () => add("Pasaje en ferry — Adulto", "Ferry", adultos || 1)],
      ...(ninos ? [["Pasaje ferry por niño", () => add("Pasaje en ferry — Niño", "Ferry", ninos)] as [string, () => void]] : []),
      ["Tasas portuarias", () => add("Tasas portuarias", "Impuestos y tasas", Math.max(1, adultos + ninos + infantes))],
      ...details.ferry.vehiculos.map(vehicle => [`Vehículo: ${vehicle.tipo}`, () => add(`Transporte de vehículo — ${vehicle.tipo}`, "Ferry", vehicle.cantidad)] as [string, () => void]),
    ] as [string, () => void][] : []),
    ["Traslado", () => add("Traslado aeropuerto – hotel – aeropuerto", "Traslado")],
    ["Seguro de viaje", () => add("Seguro de viaje", "Seguro", Math.max(1, travellers))],
    ["Cargo por servicio", () => add("Cargo por servicio", "Cargo por servicio")],
    ["Descuento", () => add("Descuento", "Descuento")],
  ];
  const move = (index: number, direction: -1 | 1) => { const list = [...items]; const target = index + direction; [list[index], list[target]] = [list[target], list[index]]; setItems(list); };
  const passengers = (field: "adultos" | "ninos" | "infantes", value: string) => update(current => ({ ...current, pasajeros: { ...current.pasajeros, [field]: Math.min(99, Number(value.replace(/\D/g, "")) || 0) } }));

  return <Section id="precio" title="Pasajeros y precio" description="El cliente ve exactamente estos conceptos y totales. Los costos internos o comisiones no se registran aquí.">
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <TextField label="Adultos" inputMode="numeric" value={String(adultos)} onChange={value => passengers("adultos", value)} />
        <TextField label="Niños" inputMode="numeric" value={String(ninos)} onChange={value => passengers("ninos", value)} />
        <TextField label="Infantes" inputMode="numeric" value={String(infantes)} onChange={value => passengers("infantes", value)} hint="Menores de 2 años" />
        <SelectField<Currency> label="Moneda" value={currency} onChange={setCurrency} options={[["USD", "USD (dólares)"], ["HNL", "HNL (lempiras)"]]} />
        {ninos ? <TextField label="Edades de los niños" value={details.pasajeros.edadesNinos} onChange={value => update(current => ({ ...current, pasajeros: { ...current.pasajeros, edadesNinos: value.slice(0, 60) } }))} placeholder="5 y 9 años" className="sm:col-span-2" /> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">{quick.map(([label, action]) => <SmallButton key={label} className="min-h-9 text-[13px]" onClick={action}><Plus size={14} strokeWidth={2} aria-hidden="true" />{label}</SmallButton>)}</div>
      <datalist id="item-types">{itemTypes.map(type => <option key={type} value={type} />)}</datalist>
      {items.length ? <div className="space-y-2">{items.map((item, index) => {
        const invalid = !amountPattern.test(item.precio_unitario) || !/^\d{1,6}$/.test(item.cantidad) || Number(item.cantidad) <= 0;
        const discount = item.tipo.trim().toLowerCase() === "descuento";
        return <div key={item.key} className={cn("grid gap-2 rounded-card border bg-canvas p-3 sm:grid-cols-12", invalid ? "border-error/50" : "border-line")}>
          <label className="sm:col-span-5"><span className="sr-only">Concepto {index + 1}</span><input className={inputClass} placeholder="Concepto que verá el cliente" maxLength={500} value={item.descripcion} onChange={event => setItem(item.key, "descripcion", event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="sr-only">Tipo del concepto {index + 1}</span><input className={inputClass} list="item-types" placeholder="Tipo" maxLength={80} value={item.tipo} onChange={event => setItem(item.key, "tipo", event.target.value)} /></label>
          <label className="sm:col-span-1"><span className="sr-only">Cantidad del concepto {index + 1}</span><input className={inputClass} inputMode="numeric" aria-invalid={!/^\d{1,6}$/.test(item.cantidad) || Number(item.cantidad) <= 0 || undefined} value={item.cantidad} onChange={event => setItem(item.key, "cantidad", event.target.value.replace(/\D/g, "").slice(0, 6))} /></label>
          <label className="sm:col-span-2"><span className="sr-only">Precio unitario del concepto {index + 1} en {currency}</span><input className={inputClass} inputMode="decimal" placeholder="0.00" aria-invalid={!amountPattern.test(item.precio_unitario) || undefined} value={item.precio_unitario} onChange={event => { const value = event.target.value.replace(",", "."); if (amountPattern.test(value)) setItem(item.key, "precio_unitario", value); }} /></label>
          <div className="flex items-center justify-between gap-2 sm:col-span-2">
            <span className={cn("t-small font-semibold whitespace-nowrap", discount && "text-success")}>{discount ? "– " : ""}{money(Math.abs(lineAmount({ tipo: item.tipo, cantidad: Number(item.cantidad) || 0, precio_unitario: Number(item.precio_unitario) || 0 })))}</span>
            <span className="flex gap-1">
              <IconButton label={`Subir concepto ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} strokeWidth={2} /></IconButton>
              <IconButton label={`Bajar concepto ${index + 1}`} disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} strokeWidth={2} /></IconButton>
              <IconButton label={`Quitar concepto ${index + 1}`} className="text-error" onClick={() => setItems(items.filter(entry => entry.key !== item.key))}><Trash2 size={15} strokeWidth={2} /></IconButton>
            </span>
          </div>
        </div>;
      })}</div> : <p className="rounded-card border border-line bg-canvas p-4 t-small text-ink-soft">Agregue los conceptos de precio con los botones de arriba o con «Agregar concepto». El tipo «Descuento» resta del total.</p>}
      <SmallButton onClick={() => setItems([...items, draftItem()])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar concepto</SmallButton>
      <dl className="grid gap-2 rounded-card border border-line bg-canvas p-4 sm:grid-cols-2">
        {summary.descuentos > 0 ? <><dt className="t-small text-ink-soft">Subtotal</dt><dd className="sm:text-right">{money(summary.subtotal)}</dd><dt className="t-small text-ink-soft">Descuentos</dt><dd className="sm:text-right">– {money(summary.descuentos)}</dd></> : null}
        <dt className="font-semibold text-ink">Total</dt><dd className="t-h3 sm:text-right">{money(summary.total)}</dd>
        {summary.porPasajero !== null ? <><dt className="t-small text-ink-soft">Por pasajero ({travellers})</dt><dd className="sm:text-right">{money(summary.porPasajero)}</dd></> : null}
        {summary.saldo !== null ? <><dt className="t-small text-ink-soft">Saldo después del anticipo</dt><dd className={cn("sm:text-right", summary.saldo < 0 && "text-error")}>{money(summary.saldo)}</dd></> : null}
      </dl>
      <label className="flex items-center gap-3 t-small text-ink"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={details.pago.precioPorPasajero} onChange={event => update(current => ({ ...current, pago: { ...current.pago, precioPorPasajero: event.target.checked } }))} />Mostrar el precio por pasajero en el PDF</label>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField label={`Anticipo (${currency})`} inputMode="decimal" value={details.pago.deposito} onChange={value => { const clean = value.replace(",", "."); if (amountPattern.test(clean)) update(current => ({ ...current, pago: { ...current.pago, deposito: clean } })); }} hint="Opcional" />
        <TextField label="Pagar el anticipo antes del" type="date" value={details.pago.depositoFecha} onChange={value => update(current => ({ ...current, pago: { ...current.pago, depositoFecha: value } }))} />
        <TextField label="Pagar el saldo antes del" type="date" value={details.pago.saldoFecha} onChange={value => update(current => ({ ...current, pago: { ...current.pago, saldoFecha: value } }))} />
        <AreaField label="Instrucciones de pago" value={details.pago.instrucciones} onChange={value => update(current => ({ ...current, pago: { ...current.pago, instrucciones: value.slice(0, 800) } }))} rows={2} className="sm:col-span-3" hint="Opcional. No incluya números de tarjeta." />
      </div>
    </div>
  </Section>;
}

export function ServicesSection({ details, update }: { details: QuotationDetails; update: Props["update"] }) {
  const services = details.servicios;
  const set = (next: QuotationDetails["servicios"]) => update(current => ({ ...current, servicios: next }));
  return <Section id="servicios" title="Servicios incluidos" description="Traslados, tours, seguros u otros servicios que forman parte de la cotización." actions={<SmallButton onClick={() => set([...services, { id: newId(), tipo: "Traslado", descripcion: "" }])}><Plus size={16} strokeWidth={2} aria-hidden="true" />Agregar servicio</SmallButton>}>
    {services.length ? <div className="space-y-2">{services.map(service => <div key={service.id} className="grid gap-2 rounded-card border border-line bg-canvas p-3 sm:grid-cols-12">
      <label className="sm:col-span-3"><span className="sr-only">Tipo de servicio</span><input className={inputClass} list="service-types" value={service.tipo} maxLength={60} onChange={event => set(services.map(item => item.id === service.id ? { ...item, tipo: event.target.value } : item))} /></label>
      <label className="sm:col-span-8"><span className="sr-only">Descripción del servicio</span><input className={inputClass} placeholder="Aeropuerto – hotel – aeropuerto en servicio compartido" value={service.descripcion} maxLength={400} onChange={event => set(services.map(item => item.id === service.id ? { ...item, descripcion: event.target.value } : item))} /></label>
      <div className="sm:col-span-1"><IconButton label="Quitar servicio" className="text-error" onClick={() => set(services.filter(item => item.id !== service.id))}><Trash2 size={15} strokeWidth={2} /></IconButton></div>
    </div>)}<datalist id="service-types">{serviceTypes.map(type => <option key={type} value={type} />)}</datalist></div> : <p className="t-small text-ink-soft">Sin servicios adicionales. Los servicios sin descripción no aparecen en el PDF.</p>}
  </Section>;
}
