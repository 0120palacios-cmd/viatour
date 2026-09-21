"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DocumentUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/mi-reserva/documentos", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "No se pudo guardar el documento.");
      formRef.current?.reset();
      setStatus("Documento guardado.");
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el documento.");
    } finally {
      setBusy(false);
    }
  }
  return <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4" aria-busy={busy}><label className="t-small block" htmlFor="portal-documento">Seleccione un documento (PDF, JPG, PNG o WebP, máximo 8 MB)</label><input id="portal-documento" name="documento" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="t-small block w-full rounded-btn border border-line bg-canvas p-3" /><Button type="submit" disabled={busy}><Upload size={18} strokeWidth={1.75} aria-hidden="true" />{busy ? "Guardando" : "Subir documento"}</Button>{status ? <p className="t-small text-ink-soft" role="status">{status}</p> : null}</form>;
}
