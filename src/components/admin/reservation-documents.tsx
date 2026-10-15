"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { agencyDocumentPath, portalDocsBucket, portalDocumentMaxBytes, portalDocumentTypes, type StoredDocument } from "@/lib/portal-documents";

const extensions: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const missingPolicy = "No se pudo completar la acción. Si es la primera vez, ejecute docs/sql/portal_docs_admin.sql en Supabase y vuelva a intentarlo.";
const dateFormat = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short" });

// Documents go straight from this browser to the private bucket with the admin's own session; access is
// decided by the storage policies in docs/sql/portal_docs_admin.sql (admins only), never by the service role.
// Going direct also avoids the 4.5 MB request limit of the hosting functions.
export function ReservationDocuments({ reservationId, documents }: { reservationId: string; documents: StoredDocument[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const shared = documents.filter(document => document.source === "agency");
  const received = documents.filter(document => document.source === "customer");

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = Array.from(input.current?.files ?? []);
    if (!files.length) return;
    const invalid = files.find(file => !(portalDocumentTypes as readonly string[]).includes(file.type) || file.size > portalDocumentMaxBytes);
    if (invalid) { setStatus({ tone: "error", text: `${invalid.name}: use PDF, JPG, PNG o WebP de hasta 8 MB.` }); return; }
    setBusy(true); setStatus(null);
    const storage = createClient().storage.from(portalDocsBucket);
    try {
      for (const file of files) {
        const prefix = Array.from(crypto.getRandomValues(new Uint8Array(4)), byte => byte.toString(16).padStart(2, "0")).join("");
        const { error } = await storage.upload(agencyDocumentPath(reservationId, file.name, extensions[file.type], prefix), file, { contentType: file.type, upsert: false });
        if (error) throw error;
      }
      if (input.current) input.current.value = "";
      setStatus({ tone: "ok", text: files.length === 1 ? "Documento compartido. El cliente ya lo ve en Mi reserva." : `${files.length} documentos compartidos. El cliente ya los ve en Mi reserva.` });
      router.refresh();
    } catch {
      setStatus({ tone: "error", text: missingPolicy });
    } finally {
      setBusy(false);
    }
  }

  async function open(path: string) {
    const { data, error } = await createClient().storage.from(portalDocsBucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { setStatus({ tone: "error", text: missingPolicy }); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(path: string) {
    setBusy(true); setStatus(null);
    const { error } = await createClient().storage.from(portalDocsBucket).remove([path]);
    setBusy(false); setConfirming(null);
    if (error) { setStatus({ tone: "error", text: missingPolicy }); return; }
    setStatus({ tone: "ok", text: "Documento eliminado." });
    router.refresh();
  }

  const list = (items: StoredDocument[], empty: string) => items.length ? <ul className="space-y-2">{items.map(document => <li key={document.path} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-canvas p-3">
    <FileText size={20} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />
    <span className="min-w-0 flex-1"><span className="t-small block break-words font-semibold">{document.source === "agency" ? document.name : "Documento del cliente"}</span>{document.createdAt && <span className="t-small block text-ink-soft">{dateFormat.format(new Date(document.createdAt))}</span>}</span>
    <Button type="button" variant="ghost" className="px-3" onClick={() => open(document.path)}><ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />Abrir</Button>
    {confirming === document.path
      ? <span className="flex items-center gap-2"><Button type="button" variant="ghost" className="px-3 text-error" disabled={busy} onClick={() => remove(document.path)}>Confirmar</Button><Button type="button" variant="ghost" className="px-3" onClick={() => setConfirming(null)}>Cancelar</Button></span>
      : <Button type="button" variant="ghost" className="px-3" aria-label={`Eliminar ${document.name}`} onClick={() => setConfirming(document.path)}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />Eliminar</Button>}
  </li>)}</ul> : <p className="t-small rounded-card border border-line bg-canvas p-4 text-ink-soft">{empty}</p>;

  return <section className="rounded-card border border-line bg-canvas p-4 sm:p-6" aria-labelledby="documents-heading">
    <h2 id="documents-heading" className="t-h3">Documentos del viaje</h2>
    <p className="mt-2 text-ink-soft">Lo que comparta aquí aparece en Mi reserva del cliente (boletos, vouchers, itinerario). El nombre del archivo es el que verá el cliente.</p>
    <form onSubmit={upload} className="mt-6 flex flex-wrap items-end gap-4" aria-busy={busy}>
      <label className="t-small block min-w-0 flex-1">Archivos (PDF, JPG, PNG o WebP, hasta 8 MB cada uno)
        <input ref={input} type="file" multiple required accept={portalDocumentTypes.join(",")} className="mt-2 block min-h-12 w-full rounded-btn border border-line bg-canvas p-1" />
      </label>
      <Button type="submit" disabled={busy}><Upload size={18} strokeWidth={1.75} aria-hidden="true" />{busy ? "Guardando" : "Compartir con el cliente"}</Button>
    </form>
    {status && <p role={status.tone === "error" ? "alert" : "status"} className={`t-small mt-4 ${status.tone === "error" ? "text-error" : "text-success"}`}>{status.text}</p>}
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="space-y-3"><h3 className="t-h3">Compartidos por viatour</h3>{list(shared, "Aún no hay documentos compartidos.")}</div>
      <div className="space-y-3"><h3 className="t-h3">Enviados por el cliente</h3>{list(received, "El cliente aún no ha enviado documentos.")}</div>
    </div>
  </section>;
}
