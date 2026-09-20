"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveQuotation, type QuotationActionState } from "@/app/admin/cotizaciones/actions";
import { formatQuotationAmount, type Customer, type Quotation, type QuotationItem } from "@/lib/quotation-types";

const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";
type DraftItem = QuotationItem & { key: string };

function itemFromRow(item: QuotationItem, index: number): DraftItem {
  return { ...item, key: item.id ?? `nuevo-${index}` };
}

export function QuotationBuilder({ customers, quotation, items = [] }: { customers: Customer[]; quotation?: Quotation; items?: QuotationItem[] }) {
  const initialCustomer = quotation?.customer_id ?? "";
  const [customerId, setCustomerId] = useState(initialCustomer);
  const [customerName, setCustomerName] = useState(quotation?.cliente_nombre ?? "");
  const [customerEmail, setCustomerEmail] = useState(quotation?.cliente_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(quotation?.cliente_telefono ?? "");
  const [draftItems, setDraftItems] = useState<DraftItem[]>(items.map(itemFromRow));
  const [state, action, pending] = useActionState<QuotationActionState, FormData>(saveQuotation, {});
  const currency = quotation?.moneda ?? "USD";
  const total = draftItems.reduce((sum, item) => sum + Number(item.cantidad || 0) * Number(item.precio_unitario || 0), 0);
  const selectCustomer = (value: string) => {
    setCustomerId(value);
    const customer = customers.find(item => item.id === value);
    if (customer) { setCustomerName(customer.nombre); setCustomerEmail(customer.email); setCustomerPhone(customer.telefono ?? ""); }
  };
  const addItem = () => setDraftItems([...draftItems, { key: `nuevo-${Date.now()}`, descripcion: "", tipo: "", cantidad: 1, precio_unitario: 0, orden: draftItems.length }]);
  const updateItem = (key: string, field: keyof DraftItem, value: string) => setDraftItems(draftItems.map(item => item.key === key ? { ...item, [field]: field === "cantidad" || field === "precio_unitario" ? Number(value) : value } : item));
  const moveItem = (index: number, direction: -1 | 1) => { const next = index + direction; if (next < 0 || next >= draftItems.length) return; const reordered = [...draftItems]; [reordered[index], reordered[next]] = [reordered[next], reordered[index]]; setDraftItems(reordered.map((item, itemIndex) => ({ ...item, orden: itemIndex }))); };
  return <form action={action} className="space-y-8">
    <input type="hidden" name="id" value={quotation?.id ?? ""} /><input type="hidden" name="customer_id" value={customerId} />
    <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="customer-section"><h2 id="customer-section" className="t-h2 mb-6">Cliente</h2><div className="grid gap-6 sm:grid-cols-2"><label className="block t-small sm:col-span-2">Cliente existente<select className={control} value={customerId} onChange={event => selectCustomer(event.target.value)}><option value="">Crear cliente nuevo con estos datos</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.nombre} — {customer.email}</option>)}</select></label><label className="block t-small">Nombre del cliente *<Input name="cliente_nombre" required maxLength={200} value={customerName} onChange={event => setCustomerName(event.target.value)} /></label><label className="block t-small">Correo electrónico *<Input name="cliente_email" required type="email" maxLength={254} value={customerEmail} onChange={event => setCustomerEmail(event.target.value)} /></label><label className="block t-small sm:col-span-2">Teléfono<Input name="cliente_telefono" maxLength={60} value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} /></label></div></section>
    <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="details-section"><h2 id="details-section" className="t-h2 mb-6">Detalles de la cotización</h2><div className="grid gap-6 sm:grid-cols-2"><label className="block t-small">Destino *<Input name="destino" required maxLength={200} defaultValue={quotation?.destino ?? ""} /></label><label className="block t-small">Moneda *<select name="moneda" className={control} defaultValue={currency}><option value="USD">USD</option><option value="HNL">HNL</option></select></label><label className="block t-small">Validez *<Input name="validez" required type="date" defaultValue={quotation?.validez ?? ""} /></label><label className="block t-small sm:col-span-2">Notas<textarea className={control} name="notas" rows={4} maxLength={5000} defaultValue={quotation?.notas ?? ""} /></label></div></section>
    <section className="rounded-panel border bg-surface p-6 sm:p-8" aria-labelledby="items-section"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 id="items-section" className="t-h2">Ítems</h2><Button type="button" variant="ghost" onClick={addItem}><Plus size={19} strokeWidth={1.75} aria-hidden="true" />Agregar ítem</Button></div>{!draftItems.length && <p className="mb-6 rounded-card border bg-canvas p-4 text-ink-soft">Agregue los servicios o conceptos de esta cotización.</p>}<div className="space-y-4">{draftItems.map((item, index) => <div key={item.key} className="rounded-card border bg-canvas p-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"><label className="block t-small lg:col-span-2">Descripción *<Input name="item_descripcion" required maxLength={500} value={item.descripcion} onChange={event => updateItem(item.key, "descripcion", event.target.value)} /></label><label className="block t-small">Tipo *<Input name="item_tipo" required maxLength={80} value={item.tipo} onChange={event => updateItem(item.key, "tipo", event.target.value)} /></label><label className="block t-small">Cantidad *<Input name="item_cantidad" required type="number" min="0.01" step="0.01" value={item.cantidad} onChange={event => updateItem(item.key, "cantidad", event.target.value)} /></label><label className="block t-small">Precio unitario *<Input name="item_precio_unitario" required type="number" min="0" step="0.01" value={item.precio_unitario} onChange={event => updateItem(item.key, "precio_unitario", event.target.value)} /></label><div className="flex items-end justify-between gap-3 lg:col-span-1"><p className="t-small"><span className="block text-ink-soft">Subtotal</span><span className="font-semibold">{formatQuotationAmount(Number(item.cantidad || 0) * Number(item.precio_unitario || 0), currency)}</span></p><div className="flex gap-1"><Button type="button" variant="ghost" className="px-3" aria-label={`Subir ítem ${index + 1}`} disabled={index === 0} onClick={() => moveItem(index, -1)}><ArrowUp size={18} strokeWidth={1.75} aria-hidden="true" /></Button><Button type="button" variant="ghost" className="px-3" aria-label={`Bajar ítem ${index + 1}`} disabled={index === draftItems.length - 1} onClick={() => moveItem(index, 1)}><ArrowDown size={18} strokeWidth={1.75} aria-hidden="true" /></Button><Button type="button" variant="ghost" className="px-3 text-error" aria-label={`Quitar ítem ${index + 1}`} onClick={() => setDraftItems(draftItems.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={18} strokeWidth={1.75} aria-hidden="true" /></Button></div></div></div></div>)}</div><div className="mt-6 flex justify-end border-t border-line pt-6"><p className="t-h2">Total: {formatQuotationAmount(total, currency)}</p></div></section>
    <div aria-live="polite">{state.error && <p role="alert" className="text-error">{state.error}</p>}{state.success && <p className="text-success">{state.success}</p>}</div>
    <div className="flex flex-wrap items-center gap-4"><Button type="submit" disabled={pending || !draftItems.length}>{pending ? "Guardando" : "Guardar cotización"}</Button>{state.quotationId && <Link className="text-brand underline underline-offset-4" href={`/admin/cotizaciones/${state.quotationId}`}>Abrir cotización guardada</Link>}</div>
  </form>;
}
