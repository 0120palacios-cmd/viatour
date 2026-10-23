"use client";

import { useActionState, useState } from "react";
import { Camera, IdCard, ScanLine, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { attachPassengerImage, deletePassengerProfile, removePassengerImage, savePassengerProfile, type ProfileState } from "@/app/admin/clientes/passenger-actions";
import { countryName, parseMrz, type MrzResult } from "@/lib/mrz";

export type ProfileView = {
  id: string; firstName: string; middleName: string; lastName: string; category: "adulto" | "nino" | "infante"; nationality: string;
  documentType: "ninguno" | "pasaporte" | "identidad" | "otro"; issuingCountry: string; expiryDate: string; documentLast4: string;
  hasPhoto: boolean; hasPassport: boolean; passportDeleteAfter: string; privateReadable: boolean;
  birthDate: string; sex: string; documentNumber: string; phone: string; email: string; emergencyContact: string; assistance: string; notes: string;
};
type Draft = Omit<ProfileView, "id" | "documentLast4" | "hasPhoto" | "hasPassport" | "passportDeleteAfter" | "privateReadable">;

const input = "mt-1 min-h-11 w-full rounded-btn border border-line bg-canvas px-3 py-2 text-ink";
const blank: Draft = { firstName: "", middleName: "", lastName: "", category: "adulto", nationality: "", documentType: "pasaporte", issuingCountry: "", expiryDate: "", birthDate: "", sex: "", documentNumber: "", phone: "", email: "", emergencyContact: "", assistance: "", notes: "" };
const day = (iso: string) => iso ? new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`)) : "";
const title = (value: string) => value.toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());

// Re-encodes the image as JPEG (max 2000 px): EXIF data such as location or device never leaves the browser.
async function prepareImage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("image")), "image/jpeg", 0.85));
}
const randomName = () => crypto.randomUUID().replaceAll("-", "");

// A private image behind a 60-second signed link: it must not go through the public image optimizer or its cache.
function PrivatePhoto({ id, alt }: { id: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/api/admin/pasajeros/${id}/foto`} alt={alt} className="size-16 rounded-card border border-line object-cover" />;
}

function expiryNote(expiry: string) {
  if (!expiry) return null;
  const months = (Date.parse(`${expiry}T12:00:00Z`) - Date.now()) / (30.4 * 86400000);
  if (months < 0) return { text: `Vencido el ${day(expiry)}`, warn: true };
  if (months < 6) return { text: `Vence el ${day(expiry)}: menos de 6 meses`, warn: true };
  return { text: `Vence el ${day(expiry)}`, warn: false };
}

export function PassengerProfiles({ customerId, profiles, available }: { customerId: string; profiles: ProfileView[]; available: boolean }) {
  const [editing, setEditing] = useState<string | null>(profiles.length ? null : "nuevo");
  if (!available) return <p className="t-small text-ink-soft">Los pasajeros frecuentes se activan con docs/sql/passenger_profiles.sql.</p>;
  return <div className="space-y-4">
    {profiles.length ? <ul className="divide-y divide-line">{profiles.map(profile => {
      const note = expiryNote(profile.expiryDate);
      return <li key={profile.id} className="space-y-3 py-4 first:pt-0">
        <div className="flex flex-wrap items-start gap-4">
          {profile.hasPhoto ? <PrivatePhoto id={profile.id} alt={`Foto de ${profile.firstName} ${profile.lastName}`} /> : <span className="flex size-16 items-center justify-center rounded-card border border-line bg-surface text-ink-soft"><UserRound size={24} strokeWidth={1.75} aria-hidden="true" /></span>}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{[profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")}</p>
            <p className="t-small text-ink-soft">{({ adulto: "Adulto", nino: "Niño", infante: "Infante" })[profile.category]}{profile.nationality ? ` · ${profile.nationality}` : ""}{profile.documentType !== "ninguno" ? ` · ${({ pasaporte: "Pasaporte", identidad: "Identidad", otro: "Documento" } as Record<string, string>)[profile.documentType]}${profile.documentLast4 ? ` terminado en ${profile.documentLast4}` : ""}` : ""}</p>
            {note ? <p className={`t-small ${note.warn ? "font-semibold text-error" : "text-ink-soft"}`}>{note.text}</p> : null}
            {profile.hasPassport ? <p className="t-small"><a className="text-brand underline underline-offset-4" href={`/api/admin/pasajeros/${profile.id}/pasaporte`} target="_blank" rel="noreferrer">Ver imagen del pasaporte</a> <span className="text-ink-soft">· se elimina el {day(profile.passportDeleteAfter)}</span></p> : null}
            {!profile.privateReadable ? <p className="t-small text-error">Los datos privados no se pueden leer con la clave de este entorno.</p> : null}
          </div>
          <Button type="button" variant="ghost" className="min-h-10 px-4" onClick={() => setEditing(editing === profile.id ? null : profile.id)}>{editing === profile.id ? "Cerrar" : "Editar"}</Button>
        </div>
        {editing === profile.id ? <ProfileForm customerId={customerId} profile={profile} onDone={() => setEditing(null)} /> : null}
      </li>;
    })}</ul> : null}
    {editing === "nuevo" ? <ProfileForm customerId={customerId} onDone={() => setEditing(null)} /> : <Button type="button" variant="ghost" onClick={() => setEditing("nuevo")}>Agregar pasajero</Button>}
  </div>;
}

function ProfileForm({ customerId, profile, onDone }: { customerId: string; profile?: ProfileView; onDone: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => profile ? { ...blank, ...profile } : blank);
  const [state, action, pending] = useActionState<ProfileState, FormData>(savePassengerProfile, {});
  const [mrzText, setMrzText] = useState("");
  const [mrz, setMrz] = useState<MrzResult | null | "none">(null);
  const set = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const field = (key: keyof Draft, label: string, type = "text", extra: Record<string, unknown> = {}) => <label className="block t-small">{label}<input className={input} type={type} value={String(draft[key])} onChange={event => set(key, event.target.value)} {...extra} /></label>;
  const profileId = profile?.id ?? state.profileId;

  function readMrz() {
    const result = parseMrz(mrzText);
    setMrz(result ?? "none");
    if (!result) return;
    setDraft(current => ({ ...current, lastName: title(result.lastName), firstName: title(result.firstName), middleName: title(result.middleName), documentType: result.documentType,
      documentNumber: result.documentNumber, issuingCountry: countryName(result.issuingCountry), nationality: countryName(result.nationality),
      birthDate: result.birthDate || current.birthDate, expiryDate: result.expiryDate || current.expiryDate, sex: result.sex === "F" ? "Femenino" : result.sex === "M" ? "Masculino" : current.sex }));
  }

  return <div className="space-y-5 rounded-panel border border-line bg-surface p-4 sm:p-6">
    <details className="rounded-card border border-line bg-canvas p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold"><ScanLine size={18} strokeWidth={1.75} aria-hidden="true" className="text-brand" />Leer el pasaporte (zona MRZ)</summary>
      <p className="t-small mt-2 text-ink-soft">Copie las dos líneas con «&lt;&lt;&lt;» al pie del pasaporte (en el teléfono: Texto en vivo en iPhone o Google Lens en Android, sobre la foto) y péguelas aquí. Se leen en este navegador; no se envían a ningún servicio. Revise siempre el resultado.</p>
      <textarea className={`${input} font-mono`} rows={3} value={mrzText} onChange={event => setMrzText(event.target.value)} spellCheck={false} autoCapitalize="characters" placeholder={"P<HND...\n..."} aria-label="Líneas MRZ del pasaporte" />
      <Button type="button" variant="ghost" className="mt-2" onClick={readMrz} disabled={!mrzText.trim()}>Leer y completar</Button>
      {mrz === "none" ? <p role="alert" className="t-small mt-2 text-error">No se reconocieron las líneas MRZ. Copie las dos líneas completas (44 caracteres cada una).</p> : null}
      {mrz && mrz !== "none" ? <p role="status" className={`t-small mt-2 ${mrz.valid ? "text-success" : "text-error"}`}>{mrz.valid ? "Datos leídos y verificados con los dígitos de control. Revíselos antes de guardar." : `Leído con errores en: ${[!mrz.checks.documentNumber && "número", !mrz.checks.birthDate && "nacimiento", !mrz.checks.expiryDate && "vencimiento", !mrz.checks.composite && "control general"].filter(Boolean).join(", ")}. Corrija contra el documento.`}</p> : null}
    </details>
    <form action={action} className="space-y-4">
      <input type="hidden" name="customer_id" value={customerId} /><input type="hidden" name="id" value={profileId ?? ""} /><input type="hidden" name="payload" value={JSON.stringify(draft)} />
      <div className="grid gap-4 sm:grid-cols-3">
        {field("firstName", "Primer nombre *", "text", { required: true, maxLength: 120 })}{field("middleName", "Otros nombres")}{field("lastName", "Apellidos *", "text", { required: true, maxLength: 120 })}
        <label className="block t-small">Tipo de pasajero<select className={input} value={draft.category} onChange={event => set("category", event.target.value)}><option value="adulto">Adulto</option><option value="nino">Niño</option><option value="infante">Infante</option></select></label>
        {field("birthDate", "Fecha de nacimiento", "date")}{field("sex", "Sexo (si lo pide el proveedor)")}{field("nationality", "Nacionalidad")}
        <label className="block t-small">Documento<select className={input} value={draft.documentType} onChange={event => set("documentType", event.target.value)}><option value="pasaporte">Pasaporte</option><option value="identidad">Identidad</option><option value="otro">Otro</option><option value="ninguno">Ninguno</option></select></label>
        {draft.documentType !== "ninguno" ? <>{field("documentNumber", "Número del documento", "text", { autoComplete: "off", maxLength: 30 })}{field("issuingCountry", "País de emisión")}{field("expiryDate", "Vencimiento", "date")}</> : null}
        {field("phone", "Teléfono", "tel")}{field("email", "Correo", "email")}{field("emergencyContact", "Contacto de emergencia")}
      </div>
      <label className="block t-small">Asistencia o notas internas<textarea className={input} rows={2} maxLength={1000} value={draft.notes} onChange={event => set("notes", event.target.value)} /></label>
      <p className="t-small text-ink-soft">Fecha de nacimiento, sexo, número del documento y contactos se guardan cifrados.</p>
      {state.error ? <p role="alert" className="t-small text-error">{state.error}</p> : null}
      {state.success ? <p role="status" className="t-small text-success">{state.success}</p> : null}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>{pending ? "Guardando" : "Guardar pasajero"}</Button><Button type="button" variant="ghost" onClick={onDone}>Cerrar</Button></div>
    </form>
    {profileId ? <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
      <ImageField profileId={profileId} kind="foto" label="Foto del pasajero" has={profile?.hasPhoto ?? false} icon={<Camera size={18} strokeWidth={1.75} aria-hidden="true" />} />
      <ImageField profileId={profileId} kind="pasaporte" label="Imagen del pasaporte" has={profile?.hasPassport ?? false} icon={<IdCard size={18} strokeWidth={1.75} aria-hidden="true" />} note="Se guarda en un espacio privado y se elimina automáticamente cuando vence el pasaporte." />
    </div> : null}
    {profile ? <DeleteProfile profileId={profile.id} /> : null}
  </div>;
}

function ImageField({ profileId, kind, label, has, icon, note }: { profileId: string; kind: "foto" | "pasaporte"; label: string; has: boolean; icon: React.ReactNode; note?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMessage(null);
    try {
      const blob = await prepareImage(file);
      if (blob.size > 5 * 1024 * 1024) throw new Error("size");
      const path = `${profileId}/${kind}-${randomName()}.jpg`;
      const { error } = await createClient().storage.from("passenger-docs").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      const result = await attachPassengerImage(profileId, kind, path);
      setMessage(result.error ? { tone: "error", text: result.error } : { tone: "success", text: result.success ?? "Imagen guardada." });
    } catch { setMessage({ tone: "error", text: "No se pudo subir la imagen. Use una foto JPG, PNG o HEIC de menos de 20 MB." }); }
    setBusy(false);
  }
  async function remove() {
    setBusy(true);
    const result = await removePassengerImage(profileId, kind);
    setMessage(result.error ? { tone: "error", text: result.error } : { tone: "success", text: result.success ?? "" });
    setBusy(false);
  }
  return <div className="space-y-2">
    <p className="flex items-center gap-2 t-small font-semibold">{icon}{label}</p>
    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-btn border border-line bg-canvas px-4 font-semibold text-ink hover:border-brand">{busy ? "Procesando" : has ? "Reemplazar" : "Subir o tomar foto"}<input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={event => void upload(event.target.files?.[0])} /></label>
    {has && !busy ? <button type="button" className="ml-3 t-small text-brand underline underline-offset-4" onClick={() => void remove()}>Eliminar</button> : null}
    {note ? <p className="t-small text-ink-soft">{note}</p> : null}
    {message ? <p role={message.tone === "error" ? "alert" : "status"} className={`t-small ${message.tone === "error" ? "text-error" : "text-success"}`}>{message.text}</p> : null}
  </div>;
}

function DeleteProfile({ profileId }: { profileId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!confirming) return <button type="button" className="inline-flex items-center gap-2 t-small text-error underline underline-offset-4" onClick={() => setConfirming(true)}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />Borrar pasajero</button>;
  return <div className="space-y-2 rounded-card border border-error/40 bg-canvas p-4 t-small">
    <p>Se borrarán el pasajero, su foto y la imagen del pasaporte. Las reservas conservan su propia copia de los datos.</p>
    <div className="flex gap-2"><Button type="button" variant="ghost" className="text-error" disabled={busy} onClick={async () => { setBusy(true); const result = await deletePassengerProfile(profileId); if (result.error) { setError(result.error); setBusy(false); } }}>{busy ? "Borrando" : "Sí, borrar"}</Button><Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Cancelar</Button></div>
    {error ? <p role="alert" className="text-error">{error}</p> : null}
  </div>;
}
