"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Download, Eye, FileText, Loader2, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SendQuotationForm } from "@/components/admin/quotation-actions";
import { duplicateQuotation, saveQuotation, type CustomerSuggestion } from "@/app/admin/cotizaciones/actions";
import { cityName, type FlightJourney } from "@/lib/flight-itinerary";
import { creatableKinds, emptyBaggage, emptyFerry, emptyFare, emptyHotel, quotationKindAdminLabels, quotationReadiness, termsTemplates, type HotelStay, type QuotationDetails, type QuotationKind } from "@/lib/quotation-details";
import type { Customer } from "@/lib/quotation-types";
import { detailsForSave, itemsAsNumbers, toPayload, type DraftItem, type EditorDraft } from "./draft";
import { PackageSection } from "./package-section";
import { CatalogProvider, emptyCatalogs, type EditorCatalogValue } from "./catalog-context";
import { FlightSection, IssueList } from "./flight-section";
import { FareBaggageSection } from "./fare-baggage-section";
import { HotelSection } from "./hotel-section";
import { FerrySection } from "./ferry-section";
import { PricingSection, ServicesSection } from "./pricing-section";
import { NotesSection, TermsSection, ValiditySection } from "./validity-terms-section";
import { Field, inputClass, Notice, Section, SmallButton, TextField } from "./fields";
import { cn } from "cn";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";
export type EditorMeta = { codigo?: string; estado?: string; estadoLabel?: string; expired?: boolean; schemaReady: boolean; sent?: boolean; converted?: boolean };
type Props = { initial: EditorDraft; customers: Customer[]; recentHotels: HotelStay[]; meta: EditorMeta; sidebar?: React.ReactNode; catalogs?: EditorCatalogValue };

const kindDescriptions: Record<QuotationKind, string> = { vuelo: "Pegue el itinerario y complete tarifa, equipaje y precio.", hotel: "Hotel, habitaciones, fotos y lo que incluye la estadía.", ferry: "Trayectos en ferry, clase, equipaje y condiciones de la naviera.", paquete: "Vuelos, hotel y servicios en una sola propuesta.", combinado: "Vuelos, hoteles, ferry, traslados, tours y otros servicios en una sola propuesta, en el orden que usted elija.", general: "Cualquier otro servicio con conceptos de precio." };
const autosaveDelay = 2500;
const previewDelay = 2000;

function sectionsFor(kind: QuotationKind) {
  if (kind === "combinado") return [["cliente", "Cliente y viaje"], ["paquete", "Servicios"], ["precio", "Precio"], ["validez", "Validez"], ["condiciones", "Condiciones"], ["notas", "Notas"]] as [string, string][];
  return [["cliente", "Cliente y viaje"], ...(kind === "vuelo" || kind === "paquete" ? [["vuelos", "Vuelos"], ["tarifa", "Clase y equipaje"]] : []), ...(kind === "hotel" || kind === "paquete" ? [["hotel", "Hotel"]] : []), ...(kind === "ferry" ? [["ferry", "Ferry"]] : []), ...(kind !== "vuelo" && kind !== "ferry" ? [["servicios", "Servicios"]] : []), ["precio", "Precio"], ["validez", "Validez"], ["condiciones", "Condiciones"], ["notas", "Notas"]] as [string, string][];
}

export function QuotationEditor({ initial, customers, recentHotels, meta, sidebar, catalogs = emptyCatalogs }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>(initial.id ? "saved" : "dirty");
  const [message, setMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  // An accepted quotation is read-only (the database enforces it too); changes go through an amendment.
  const locked = meta.estado === "aceptada";
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");
  const [autoPreview, setAutoPreview] = useState(true);
  const [mobileTab, setMobileTab] = useState<"editar" | "revisar">("editar");
  const [duplicating, startDuplicate] = useTransition();
  const draftRef = useRef(draft);
  const revision = useRef(0);
  const saving = useRef(false);
  const queued = useRef(false);
  const saveRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const change = useCallback((next: (current: EditorDraft) => EditorDraft) => {
    setDraft(current => next(current));
    revision.current += 1;
    setSaveState(state => state === "conflict" ? state : "dirty");
  }, []);
  const update = useCallback((fn: (details: QuotationDetails) => QuotationDetails) => change(current => ({ ...current, detalles: fn(current.detalles) })), [change]);

  const save = useCallback(async () => {
    if (locked) return;
    if (saving.current) { queued.current = true; return; }
    const current = draftRef.current;
    if (!current.cliente.nombre.trim()) { setSaveState("error"); setMessage("Ingrese el nombre del cliente para guardar."); return; }
    saving.current = true;
    const startedAt = revision.current;
    setSaveState("saving");
    const result = await saveQuotation(toPayload(current));
    saving.current = false;
    setSuggestions(result.customerSuggestions ?? []);
    if (result.error && !result.quotationId) {
      setSaveState(result.conflict ? "conflict" : "error");
      setMessage(result.error);
      return;
    }
    setDraft(value => ({ ...value, id: result.quotationId ?? value.id, updatedAt: result.updatedAt ?? value.updatedAt }));
    draftRef.current = { ...draftRef.current, id: result.quotationId ?? draftRef.current.id, updatedAt: result.updatedAt ?? draftRef.current.updatedAt };
    setMessage(result.error ?? null);
    setLastSaved(new Date());
    setSaveState(result.error ? "error" : revision.current === startedAt ? "saved" : "dirty");
    // Opening the saved quotation remounts the editor from the database, so it waits until nothing typed
    // during the save is pending; the next save (autosave) moves on when the edits are stored.
    if (result.quotationId && revision.current === startedAt && window.location.pathname.endsWith("/nuevo")) router.replace(`/admin/cotizaciones/${result.quotationId}`);
    if (queued.current) { queued.current = false; void saveRef.current(); }
  }, [router, locked]);
  useEffect(() => { saveRef.current = save; }, [save]);

  // Autosave once a quotation exists; a new one is created by the first explicit save.
  useEffect(() => {
    if (!draft.id || locked || saveState !== "dirty") return;
    const timer = window.setTimeout(() => { void save(); }, autosaveDelay);
    return () => window.clearTimeout(timer);
  }, [draft, saveState, save, locked]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saveState === "dirty" || saveState === "saving" || saveState === "error") { event.preventDefault(); event.returnValue = ""; } };
    const shortcut = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); } };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("keydown", shortcut); };
  }, [saveState, save]);

  const previewRef = useRef<string | null>(null);
  const refreshPreview = useCallback(async () => {
    if (!draftRef.current.cliente.nombre.trim()) return;
    setPreviewState("loading");
    try {
      const response = await fetch("/api/admin/cotizaciones/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: toPayload(draftRef.current) });
      // A redirect to the login page (expired session) also answers 200: only a PDF counts as a preview.
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("application/pdf")) throw new Error("preview");
      const url = URL.createObjectURL(await response.blob());
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = url;
      setPreviewUrl(url);
      setPreviewState("idle");
    } catch {
      setPreviewState("error");
    }
  }, []);
  useEffect(() => {
    if (!autoPreview) return;
    const timer = window.setTimeout(() => { void refreshPreview(); }, previewDelay);
    return () => window.clearTimeout(timer);
  }, [draft, autoPreview, refreshPreview]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);

  const readiness = useMemo(() => quotationReadiness(draft.tipo, detailsForSave(draft), itemsAsNumbers(draft.items)), [draft]);
  const blocking = readiness.filter(issue => issue.nivel === "error");

  const setKind = (tipo: QuotationKind) => change(current => {
    const details = current.detalles;
    const usesTemplate = details.condiciones.join("\n") === termsTemplates[current.tipo].join("\n") || !details.condiciones.length;
    const needsFlights = tipo === "vuelo" || tipo === "paquete";
    const needsHotels = tipo === "hotel" || tipo === "paquete";
    return { ...current, tipo, detalles: {
      ...details,
      tarifas: needsFlights && !details.tarifas.length ? [emptyFare()] : details.tarifas,
      equipaje: needsFlights && !details.equipaje.length ? [emptyBaggage()] : details.equipaje,
      hoteles: needsHotels && !details.hoteles.length ? [emptyHotel()] : details.hoteles,
      ferry: tipo === "ferry" && !details.ferry.legs.length ? emptyFerry(true) : details.ferry,
      condiciones: usesTemplate ? [...termsTemplates[tipo]] : details.condiciones,
    } };
  });

  const applyItinerary = (journeys: FlightJourney[]) => change(current => {
    const first = journeys[0]?.segmentos[0];
    const outboundEnd = journeys[0]?.segmentos.at(-1);
    return { ...current, destino: current.destino || (outboundEnd ? cityName(outboundEnd.destino, outboundEnd.destinoNombre) : ""), detalles: { ...current.detalles, origen: current.detalles.origen || (first ? cityName(first.origen, first.origenNombre) : "") } };
  });

  const chooseCustomer = (value: string) => {
    const customer = customers.find(item => `${item.nombre} · ${item.email}` === value);
    if (customer) change(current => ({ ...current, customerId: customer.id, cliente: { nombre: customer.nombre, email: customer.email, telefono: customer.telefono ?? "" } }));
  };
  const linked = customers.find(item => item.id === draft.customerId);
  const saveLabel = { saved: lastSaved ? `Guardado ${lastSaved.toLocaleTimeString("es-HN", { hour: "numeric", minute: "2-digit" })}` : "Guardado", dirty: draft.id ? "Cambios sin guardar" : "Borrador sin guardar", saving: "Guardando", error: "No se guardó", conflict: "Conflicto de edición" }[saveState];

  const editor = <div className="space-y-6">
    {locked ? <Notice>{meta.converted ? "Esta cotización ya se convirtió en reserva. " : ""}El cliente aceptó esta cotización, así que su contenido quedó bloqueado y solo se puede consultar. Para cambiar precios o condiciones, use «Crear enmienda»: se crea una cotización nueva y esta se conserva tal como se aceptó.</Notice> : null}
    {draft.detalles.enmiendaDe ? <Notice>Enmienda de la cotización {draft.detalles.enmiendaDe}. Revise y apruebe de nuevo itinerario, equipaje y condiciones antes de enviarla.</Notice> : null}
    {!meta.schemaReady ? <Notice tone="error">La base de datos aún no tiene las columnas de cotizaciones estructuradas. Ejecute docs/sql/quotations_v5.sql en Supabase para guardar vuelos, hoteles, fotos y validez con hora.</Notice> : null}
    <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
    {!draft.id ? <Section id="tipo" title="Tipo de cotización">
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tipo de cotización">{(creatableKinds.includes(draft.tipo) ? creatableKinds : [...creatableKinds, draft.tipo]).map(kind => <button key={kind} type="button" role="radio" aria-checked={draft.tipo === kind} onClick={() => setKind(kind)} className={cn("rounded-card border p-4 text-left transition-colors", draft.tipo === kind ? "border-brand bg-brand-tint" : "border-line bg-canvas hover:bg-surface")}><span className="block font-semibold text-ink">{quotationKindAdminLabels[kind]}</span><span className="t-small text-ink-soft">{kindDescriptions[kind]}</span></button>)}</div>
    </Section> : null}
    <Section id="cliente" title="Cliente y viaje">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Buscar cliente existente" className="sm:col-span-2" hint={linked ? `Vinculada a ${linked.nombre}.` : "Escriba para buscar por nombre o correo; si no existe, se crea con los datos de abajo."}>{(id, describedBy) => <><input id={id} aria-describedby={describedBy} className={inputClass} list="customer-options" placeholder="Nombre o correo" onChange={event => chooseCustomer(event.target.value)} /><datalist id="customer-options">{customers.map(customer => <option key={customer.id} value={`${customer.nombre} · ${customer.email}`} />)}</datalist></>}</Field>
        <TextField label="Nombre del cliente *" value={draft.cliente.nombre} onChange={value => change(current => ({ ...current, cliente: { ...current.cliente, nombre: value.slice(0, 200) } }))} autoComplete="off" />
        <TextField label="Correo electrónico" type="email" value={draft.cliente.email} onChange={value => change(current => ({ ...current, cliente: { ...current.cliente, email: value.slice(0, 254) } }))} hint="Necesario para enviar la cotización" autoComplete="off" />
        <TextField label="Teléfono o WhatsApp" value={draft.cliente.telefono} onChange={value => change(current => ({ ...current, cliente: { ...current.cliente, telefono: value.slice(0, 60) } }))} autoComplete="off" />
        <TextField label="Destino" value={draft.destino} onChange={value => change(current => ({ ...current, destino: value.slice(0, 200) }))} placeholder="Monterrey, México" />
        <TextField label="Ciudad de salida" value={draft.detalles.origen} onChange={value => update(details => ({ ...details, origen: value.slice(0, 120) }))} placeholder="San Pedro Sula" />
        {draft.tipo !== "vuelo" && draft.tipo !== "ferry" ? <><TextField label="Fecha de inicio del viaje" type="date" value={draft.detalles.fechaSalida} onChange={value => update(details => ({ ...details, fechaSalida: value }))} hint="Opcional; se toma de vuelos u hoteles si la deja vacía" /><TextField label="Fecha de regreso" type="date" value={draft.detalles.fechaRegreso} onChange={value => update(details => ({ ...details, fechaRegreso: value }))} /></> : null}
      </div>
    </Section>
    {draft.tipo === "vuelo" || draft.tipo === "paquete" ? <><FlightSection details={draft.detalles} update={update} onApplyItinerary={applyItinerary} /><FareBaggageSection details={draft.detalles} update={update} /></> : null}
    {draft.tipo === "hotel" || draft.tipo === "paquete" ? <HotelSection details={draft.detalles} update={update} recentHotels={recentHotels} /> : null}
    {draft.tipo === "ferry" ? <FerrySection details={draft.detalles} update={update} /> : null}
    {draft.tipo === "combinado" ? <PackageSection details={draft.detalles} update={update} recentHotels={recentHotels} onApplyItinerary={applyItinerary} /> : null}
    {draft.tipo !== "vuelo" && draft.tipo !== "combinado" ? <ServicesSection details={draft.detalles} update={update} /> : null}
    <PricingSection kind={draft.tipo} items={draft.items} setItems={(items: DraftItem[]) => change(current => ({ ...current, items }))} currency={draft.moneda} setCurrency={moneda => change(current => ({ ...current, moneda }))} details={draft.detalles} update={update} />
    <ValiditySection details={draft.detalles} update={update} sent={Boolean(meta.sent)} />
    <TermsSection details={draft.detalles} update={update} kind={draft.tipo} />
    <NotesSection notes={draft.notas} setNotes={notas => change(current => ({ ...current, notas }))} details={draft.detalles} update={update} />
    </fieldset>
  </div>;

  const panel = <div className="space-y-4">
    <section aria-labelledby="readiness-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="readiness-title" className="mb-2 flex items-center gap-2 font-semibold text-ink">{blocking.length ? <AlertTriangle size={18} strokeWidth={2} className="text-error" aria-hidden="true" /> : <CheckCircle2 size={18} strokeWidth={2} className="text-success" aria-hidden="true" />}{blocking.length ? `Faltan ${blocking.length} ${blocking.length === 1 ? "dato" : "datos"} para enviar` : "Lista para enviar"}</h2>
      <IssueList issues={readiness.slice(0, 12)} empty="Todo lo necesario está completo." />
      {readiness.length > 12 ? <p className="mt-1 t-small text-ink-soft">Y {readiness.length - 12} más.</p> : null}
    </section>
    <section aria-labelledby="preview-title" className="rounded-panel border border-line bg-canvas p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 id="preview-title" className="flex items-center gap-2 font-semibold text-ink"><Eye size={18} strokeWidth={2} aria-hidden="true" />Vista previa del PDF</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 t-small text-ink-soft"><input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={autoPreview} onChange={event => setAutoPreview(event.target.checked)} />Automática</label>
          <SmallButton onClick={() => void refreshPreview()} disabled={previewState === "loading"}>{previewState === "loading" ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <RefreshCw size={16} strokeWidth={2} aria-hidden="true" />}Actualizar</SmallButton>
        </div>
      </div>
      {previewState === "error" ? <Notice tone="error">No se pudo generar la vista previa. Revise los datos marcados e intente de nuevo.</Notice> : null}
      <div className="relative aspect-[8.5/11] w-full overflow-hidden rounded-card border border-line bg-surface">
        {previewUrl ? <iframe title="Vista previa del PDF de la cotización" src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} className="size-full" /> : <p className="absolute inset-0 grid place-items-center p-6 text-center t-small text-ink-soft">{!draft.cliente.nombre.trim() ? "Ingrese el nombre del cliente para ver la vista previa." : previewState === "error" ? "Vista previa no disponible. Si su sesión venció, vuelva a iniciar sesión." : "Generando la vista previa"}</p>}
        {previewState === "loading" && previewUrl ? <span className="absolute right-2 top-2 rounded-btn bg-canvas px-2 py-1 t-small text-ink-soft shadow-sm">Actualizando</span> : null}
      </div>
      {previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 px-1 t-small text-brand underline underline-offset-4"><FileText size={15} strokeWidth={2} aria-hidden="true" />Abrir la vista previa en otra pestaña</a> : null}
    </section>
    {draft.id ? <section aria-labelledby="send-title" className="rounded-panel border border-line bg-canvas p-4">
      <h2 id="send-title" className="mb-2 font-semibold text-ink">Enviar al cliente</h2>
      <p className="mb-3 t-small text-ink-soft">Se registra una versión con lo que el cliente recibe y se envía el PDF a {draft.cliente.email || "su correo"}.</p>
      <SendQuotationForm id={draft.id} disabled={saveState !== "saved" || blocking.length > 0 || !draft.cliente.email} reason={saveState !== "saved" ? "Guarde los cambios antes de enviar." : blocking.length ? "Complete los datos pendientes para enviar." : !draft.cliente.email ? "Agregue el correo del cliente." : undefined} />
    </section> : null}
    {sidebar}
  </div>;

  return <CatalogProvider value={catalogs}><div className="space-y-4">
    <div className="sticky top-0 z-20 -mx-4 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="t-small text-ink-soft">{meta.codigo ?? "Nueva cotización"} · {quotationKindAdminLabels[draft.tipo]}{meta.estadoLabel ? ` · ${meta.estadoLabel}` : ""}{meta.expired ? " · Vencida" : ""}</p>
          <p role="status" aria-live="polite" className={cn("flex items-center gap-1.5 t-small font-semibold", saveState === "saved" ? "text-success" : saveState === "error" || saveState === "conflict" ? "text-error" : "text-ink")}>{saveState === "saving" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}{saveLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void save()} disabled={locked || saveState === "saving" || saveState === "conflict"} className="min-h-10 px-4" title="Ctrl + S"><Save size={17} strokeWidth={2} aria-hidden="true" />{draft.id ? "Guardar" : "Guardar borrador"}</Button>
          {draft.id ? <a href={`/api/admin/cotizaciones/${draft.id}/pdf`} className={cn("inline-flex min-h-10 items-center gap-2 rounded-btn border border-line px-4 text-ink hover:bg-surface", saveState !== "saved" && "pointer-events-none opacity-50")} aria-disabled={saveState !== "saved"}><Download size={17} strokeWidth={2} aria-hidden="true" />Descargar PDF</a> : null}
          {draft.id ? <Button type="button" variant="ghost" className="min-h-10 px-4" disabled={duplicating || saveState !== "saved"} onClick={() => startDuplicate(async () => { const result = await duplicateQuotation(draft.id as string, locked ? "enmienda" : "copia"); if (result?.error) setMessage(result.error); })}><Copy size={17} strokeWidth={2} aria-hidden="true" />{duplicating ? "Creando" : locked ? "Crear enmienda" : "Duplicar"}</Button> : null}
        </div>
      </div>
      {suggestions.length && !draft.customerId ? <div className="mt-2"><Notice>Ya hay {suggestions.length === 1 ? "un cliente registrado" : "clientes registrados"} con el correo {draft.cliente.email}, con otro nombre. La cotización no se vinculó a ninguno. Si es la misma persona, vincúlela: {suggestions.map(suggestion => <button key={suggestion.id} type="button" className="ml-2 font-semibold text-brand underline underline-offset-4" onClick={() => { change(current => ({ ...current, customerId: suggestion.id })); setSuggestions([]); }}>{suggestion.nombre}</button>)}</Notice></div> : null}
      {message ? <div className="mt-2"><Notice tone={saveState === "error" || saveState === "conflict" ? "error" : "info"}>{message}{saveState === "conflict" ? <> <button type="button" className="font-semibold underline underline-offset-4" onClick={() => window.location.reload()}>Recargar</button></> : null}</Notice></div> : null}
      <nav aria-label="Secciones de la cotización" className="mt-2 hidden gap-1 overflow-x-auto lg:flex">{sectionsFor(draft.tipo).map(([id, label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-btn px-3 py-1.5 t-small text-ink-soft hover:bg-surface hover:text-ink">{label}</a>)}</nav>
      <div className="mt-2 grid grid-cols-2 gap-2 lg:hidden" role="tablist" aria-label="Vista">
        {(["editar", "revisar"] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={mobileTab === tab} onClick={() => setMobileTab(tab)} className={cn("min-h-10 rounded-btn border t-small font-semibold", mobileTab === tab ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink")}>{tab === "editar" ? "Editar" : `Revisar y enviar${blocking.length ? ` (${blocking.length})` : ""}`}</button>)}
      </div>
    </div>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className={cn(mobileTab !== "editar" && "hidden lg:block")}>{editor}</div>
      <aside className={cn("lg:sticky lg:top-36 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto", mobileTab !== "revisar" && "hidden lg:block")} aria-label="Revisión, vista previa y envío">{panel}</aside>
    </div>
  </div></CatalogProvider>;
}
