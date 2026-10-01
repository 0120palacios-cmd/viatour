"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalUploadMaxBytes } from "@/lib/portal-documents";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Phone photos of passports are often 5–10 MB, above the 4 MB the upload can carry. They are redrawn
// as JPEG at a readable size (longest side 2400px, then 1800px) before sending; PDFs are sent as they are.
async function fitImage(file: File): Promise<File | null> {
  if (file.size <= portalUploadMaxBytes) return file;
  if (!imageTypes.has(file.type) || typeof createImageBitmap !== "function") return null;
  const bitmap = await createImageBitmap(file);
  try {
    for (const [side, quality] of [[2400, 0.85], [1800, 0.8], [1400, 0.75]] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= portalUploadMaxBytes) return new File([blob], "documento.jpg", { type: "image/jpeg" });
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export function DocumentUploadForm() {
  const t = useTranslations("portal");
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).get("documento");
    if (!(selected instanceof File) || !selected.size) return;
    setBusy(true); setStatus("");
    try {
      const file = await fitImage(selected).catch(() => null);
      if (!file) throw new Error(t("documentTooLarge"));
      const body = new FormData(); body.set("documento", file);
      const response = await fetch("/api/mi-reserva/documentos", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : t("genericError"));
      formRef.current?.reset();
      setStatus(t("saved"));
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }
  return <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4 border-t border-line pt-6" aria-busy={busy}>
    <label className="t-small block" htmlFor="portal-documento">{t("documentLabel")}</label>
    <input id="portal-documento" name="documento" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="block min-h-12 w-full rounded-btn border border-line bg-canvas p-1" />
    <Button type="submit" disabled={busy}><Upload size={18} strokeWidth={1.75} aria-hidden="true" />{busy ? t("uploading") : t("upload")}</Button>
    {status ? <p className="t-small text-ink-soft" role="status">{status}</p> : null}
  </form>;
}
