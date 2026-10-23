"use client";

import { useActionState, useEffect, useState } from "react";
import { Copy, Download, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmWhatsappShare, prepareWhatsappShare, revokeQuotationShare, type ShareState } from "@/app/admin/cotizaciones/actions";

const input = "mt-1 block w-full rounded-btn border border-line bg-canvas px-3 py-2 text-ink";
const secondary = "inline-flex min-h-11 items-center gap-2 rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface disabled:opacity-50";

// "Compartir por WhatsApp": prepare (freeze the version and a secure link), share (WhatsApp chat with the
// message; the PDF through the phone's share sheet when the browser supports files, or downloaded), then
// confirm. Only "Lo envié" records the quotation as sent; opening WhatsApp proves nothing.
export function WhatsappShareForm({ id, defaultPhone, defaultMessage, disabled = false, reason }: { id: string; defaultPhone: string; defaultMessage: string; disabled?: boolean; reason?: string }) {
  const [prepared, prepare, preparing] = useActionState<ShareState, FormData>(prepareWhatsappShare, {});
  const [result, confirm, confirming] = useActionState<ShareState, FormData>(confirmWhatsappShare, {});
  const [pdf, setPdf] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [canShareFiles, setCanShareFiles] = useState(false);
  const shareId = prepared.shareId && result.done === undefined ? prepared.shareId : "";

  // The PDF is fetched as soon as the link is ready, so the share sheet opens within the click's user gesture.
  useEffect(() => {
    if (!shareId || !prepared.versionPdf) return;
    let alive = true;
    fetch(prepared.versionPdf).then(response => response.ok ? response.blob() : null).then(blob => {
      if (!alive || !blob) return;
      const file = new File([blob], `cotizacion-${prepared.versionNumber ?? ""}.pdf`.replace("-.pdf", ".pdf"), { type: "application/pdf" });
      setPdf(file);
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [shareId, prepared.versionPdf, prepared.versionNumber]);

  async function sharePdf() {
    if (!pdf) return;
    try { await navigator.share({ files: [pdf], text: prepared.message }); setNote("Se abrió el menú para compartir el PDF."); }
    catch (error) { setNote(error instanceof DOMException && error.name === "AbortError" ? "Se canceló el menú para compartir." : "Este navegador no pudo compartir el archivo. Descárguelo y adjúntelo en WhatsApp."); }
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(prepared.shareUrl ?? ""); setNote("Enlace copiado."); } catch { setNote("No se pudo copiar; seleccione el enlace y cópielo."); }
  }

  if (result.done) return <div aria-live="polite" className="space-y-3"><p className="t-small text-success">{result.success}</p>{result.done === "cancelado" ? <Button type="button" variant="ghost" onClick={() => location.reload()}>Preparar otro envío</Button> : null}</div>;

  if (shareId) return <div className="space-y-4">
    <ol className="space-y-4">
      <li className="space-y-2">
        <p className="t-small font-semibold text-ink">1. Envíe el mensaje</p>
        <a href={prepared.whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-btn bg-wa px-4 font-semibold text-white hover:bg-wa-deep"><MessageCircle size={18} strokeWidth={2} aria-hidden="true" />Abrir WhatsApp</a>
        <p className="t-small text-ink-soft">WhatsApp se abre con el mensaje y el enlace seguro; usted lo envía desde allí.</p>
      </li>
      <li className="space-y-2">
        <p className="t-small font-semibold text-ink">2. Si desea, adjunte el PDF (versión {prepared.versionNumber})</p>
        <div className="flex flex-wrap gap-2">
          {canShareFiles ? <button type="button" className={secondary} onClick={() => void sharePdf()}><Share2 size={17} strokeWidth={2} aria-hidden="true" />Compartir PDF</button> : null}
          <a className={secondary} href={prepared.versionPdf} download><Download size={17} strokeWidth={2} aria-hidden="true" />Descargar PDF</a>
          <button type="button" className={secondary} onClick={() => void copyLink()}><Copy size={17} strokeWidth={2} aria-hidden="true" />Copiar enlace</button>
        </div>
        <p className="t-small text-ink-soft">{canShareFiles ? "«Compartir PDF» abre el menú del teléfono o del sistema para elegir WhatsApp." : "En este navegador, descargue el PDF y adjúntelo en el chat. El cliente también puede descargarlo desde el enlace."}</p>
      </li>
      <li className="space-y-2">
        <p className="t-small font-semibold text-ink">3. ¿Lo envió?</p>
        <form action={confirm} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="share_id" value={shareId} />
          <Button type="submit" name="resultado" value="si" disabled={confirming}>{confirming ? "Registrando" : "Lo envié"}</Button>
          <Button type="submit" name="resultado" value="no" variant="ghost" disabled={confirming}>No lo envié</Button>
        </form>
        <p className="t-small text-ink-soft">Solo «Lo envié» marca la cotización como enviada.</p>
      </li>
    </ol>
    {note ? <p aria-live="polite" className="t-small text-ink-soft">{note}</p> : null}
    {result.error ? <p role="alert" className="t-small text-error">{result.error}</p> : null}
  </div>;

  return <form action={prepare} className="space-y-3">
    <input type="hidden" name="id" value={id} />
    <label className="block t-small text-ink">Número de WhatsApp del cliente<input name="telefono" type="tel" inputMode="tel" autoComplete="off" required defaultValue={defaultPhone} placeholder="+504 9999-9999" className={input} /></label>
    <label className="block t-small text-ink">Mensaje<textarea name="mensaje" required rows={6} maxLength={880} defaultValue={defaultMessage} className={input} /></label>
    <p className="t-small text-ink-soft">{"{enlace}"} se reemplaza por el enlace seguro a esta versión. El enlace vence con la validez de la cotización.</p>
    <Button type="submit" disabled={preparing || disabled}>{preparing ? "Preparando" : "Preparar envío"}</Button>
    {reason && !preparing ? <p className="t-small text-ink-soft">{reason}</p> : null}
    {prepared.error ? <p role="alert" className="t-small text-error">{prepared.error}</p> : null}
  </form>;
}

export function RevokeShareButton({ id, shareId }: { id: string; shareId: string }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(revokeQuotationShare, {});
  if (state.success) return <span className="t-small text-success">{state.success}</span>;
  return <form action={action} className="inline"><input type="hidden" name="id" value={id} /><input type="hidden" name="share_id" value={shareId} /><button type="submit" disabled={pending} className="t-small text-brand underline underline-offset-4 disabled:opacity-50">{pending ? "Desactivando" : "Desactivar enlace"}</button>{state.error ? <span role="alert" className="ml-2 t-small text-error">{state.error}</span> : null}</form>;
}

// A share prepared earlier (the page was reloaded after opening WhatsApp) can still be confirmed or cancelled.
export function PendingShareActions({ id, shareId }: { id: string; shareId: string }) {
  const [state, action, pending] = useActionState<ShareState, FormData>(confirmWhatsappShare, {});
  if (state.done) return <span className="t-small text-success">{state.success}</span>;
  return <form action={action} className="flex flex-wrap items-center gap-3"><input type="hidden" name="id" value={id} /><input type="hidden" name="share_id" value={shareId} />
    <Button type="submit" name="resultado" value="si" disabled={pending} className="min-h-10 px-3">{pending ? "Registrando" : "Lo envié"}</Button>
    <button type="submit" name="resultado" value="no" disabled={pending} className="t-small text-brand underline underline-offset-4 disabled:opacity-50">No lo envié</button>
    {state.error ? <span role="alert" className="w-full t-small text-error">{state.error}</span> : null}
  </form>;
}
