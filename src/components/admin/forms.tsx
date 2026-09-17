"use client";
import { useActionState, useState } from "react";
import { AlertDialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login, save, type Result } from "@/app/admin/actions";
const control = "w-full rounded-btn border border-line bg-canvas p-3 text-ink focus-visible:border-brand";
function Message({ state }: {
    state: Result;
}) { return <div aria-live="polite">{state.error && <p role="alert" className="text-error">{state.error}</p>}{state.success && <p className="text-ink">{state.success}</p>}</div>; }
function Submit({ pending }: {
    pending: boolean;
}) { return <Button disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar cambios"}</Button>; }
export function LoginForm() {
    const [state, action, pending] = useActionState(login, {});
    return <form action={action} className="space-y-6"><label className="block t-small">Correo electrónico<Input name="email" type="email" autoComplete="username" required maxLength={254}/></label><label className="block t-small">Contraseña<Input name="password" type="password" autoComplete="current-password" required/></label><Message state={state}/><Button disabled={pending}>{pending ? "Ingresando…" : "Iniciar sesión"}</Button><p className="t-small text-ink-soft">Si necesita restablecer su contraseña, solicítelo al propietario mediante el dashboard de Supabase.</p></form>;
}
export function StatusForm({ table, row }: {
    table: "reviews" | "leads";
    row: Record<string, unknown>;
}) {
    const [state, action, pending] = useActionState(save, {});
    const states = table === "reviews" ? ["pendiente", "aprobada", "rechazada"] : ["nuevo", "contactado", "cerrado"];
    return <form action={action} className="mt-4 flex flex-wrap items-end gap-4"><input type="hidden" name="table" value={table}/><input type="hidden" name="id" value={String(row.id)}/><label className="t-small">Estado<select className={control} name="estado" defaultValue={String(row.estado)}>{states.map(s => <option key={s}>{s}</option>)}</select></label>{table === "reviews" && <label className="flex items-center gap-2"><input type="checkbox" name="verificada" defaultChecked={row.verificada === true}/>Verificada</label>}<Submit pending={pending}/>{table === "reviews" && <><Button type="submit" variant="ghost" disabled={pending} name="accion_estado" value="aprobada">Aprobar</Button><Button type="submit" variant="ghost" disabled={pending} name="accion_estado" value="rechazada">Rechazar</Button></>}<Message state={state}/></form>;
}
export function DeleteForm({ table, id, name }: {
    table: string;
    id: string;
    name: string;
}) {
    const [state, action, pending] = useActionState(save, {});
    const [open, setOpen] = useState(false);
    return <div><AlertDialog.Root open={open} onOpenChange={setOpen}><AlertDialog.Trigger asChild><Button variant="ghost">Eliminar</Button></AlertDialog.Trigger><AlertDialog.Portal><AlertDialog.Overlay className="fixed inset-0 z-50 bg-ink/50"/><AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-panel border bg-canvas p-6 shadow-md"><AlertDialog.Title className="t-h3">Eliminar {name}</AlertDialog.Title><AlertDialog.Description className="mt-4 text-ink-soft">¿Desea eliminar este registro? Esta acción no se puede deshacer.</AlertDialog.Description><form action={action} className="mt-6 space-y-4"><input type="hidden" name="table" value={table}/><input type="hidden" name="id" value={id}/><input type="hidden" name="operation" value="delete"/><Message state={state}/><div className="flex gap-4"><AlertDialog.Cancel asChild><Button type="button" variant="ghost" disabled={pending}>Cancelar</Button></AlertDialog.Cancel><Button disabled={pending}>{pending ? "Eliminando…" : "Confirmar eliminación"}</Button></div></form></AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root></div>;
}
export function ContentForm({ table, row = {}, destinations = [] }: {
    table: "packages" | "destinations";
    row?: Record<string, unknown>;
    destinations?: Record<string, unknown>[];
}) {
    const [state, action, pending] = useActionState(save, {});
    const [faqs, setFaqs] = useState((Array.isArray(row.faqs) ? row.faqs : []) as {
        pregunta: string;
        respuesta: string;
    }[]);
    const fields = table === "packages" ? [["nombre", "Nombre"], ["slug", "Slug"], ["destino", "Destino"], ["resumen", "Resumen"], ["descripcion", "Descripción"], ["duracion", "Duración"]] : [["nombre", "Nombre"], ["slug", "Slug"], ["titulo_seo", "Título SEO"], ["meta_descripcion", "Descripción SEO"], ["intro", "Introducción"], ["cuerpo", "Cuerpo"], ["mejor_epoca", "Mejor época"]];
    return <form action={action} className="space-y-6 rounded-panel border bg-surface p-6"><input type="hidden" name="table" value={table}/><input type="hidden" name="id" value={String(row.id ?? "")}/><p className="t-small text-ink-soft">Los campos con * son obligatorios. Revise el contenido antes de publicarlo.</p><div className="grid gap-6 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="block t-small">{label}{["nombre", "slug"].includes(key) ? " *" : ""}{["resumen", "descripcion", "intro", "cuerpo", "meta_descripcion", "mejor_epoca"].includes(key) ? <textarea className={control} name={key} rows={4} defaultValue={String(row[key] ?? "")}/> : <Input name={key} defaultValue={String(row[key] ?? "")} required={["nombre", "slug"].includes(key)} pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}/>}</label>)}<label className="t-small">URL de imagen (HTTPS)<Input type="url" name="imagen_url" defaultValue={String(row.imagen_url ?? "")}/></label><label className="t-small">Orden *<Input type="number" name="orden" step="1" required defaultValue={Number(row.orden ?? 0)}/></label>{table === "packages" && <><label className="t-small">Destino relacionado<select name="destination_id" className={control} defaultValue={String(row.destination_id ?? "")}><option value="">Sin destino relacionado</option>{destinations.map(d => <option key={String(d.id)} value={String(d.id)}>{String(d.nombre)}</option>)}</select></label><label className="t-small">Incluye (un elemento por línea)<textarea name="incluye" rows={4} className={control} defaultValue={Array.isArray(row.incluye) ? row.incluye.join("\n") : ""}/></label><label className="t-small">Precio desde<Input type="number" name="precio_desde" min="0" step="0.01" defaultValue={row.precio_desde == null ? "" : Number(row.precio_desde)}/><span className="text-ink-soft">Vacío: pídanos su cotización.</span></label><label className="t-small">Moneda<select className={control} name="moneda" defaultValue={String(row.moneda ?? "USD")}><option>USD</option><option>HNL</option></select></label></>}</div>{table === "destinations" && <fieldset className="space-y-4"><legend className="t-h3">Preguntas frecuentes</legend>{faqs.map((faq, i) => <div key={i} className="space-y-4 rounded-card border bg-canvas p-4"><label className="block t-small">Pregunta {i + 1}<Input name="pregunta" value={faq.pregunta} onChange={e => setFaqs(faqs.map((f, n) => n === i ? { ...f, pregunta: e.target.value } : f))}/></label><label className="block t-small">Respuesta {i + 1}<textarea name="respuesta" className={control} value={faq.respuesta} onChange={e => setFaqs(faqs.map((f, n) => n === i ? { ...f, respuesta: e.target.value } : f))}/></label><Button type="button" variant="ghost" onClick={() => setFaqs(faqs.filter((_, n) => n !== i))}>Quitar pregunta {i + 1}</Button></div>)}<Button type="button" variant="ghost" onClick={() => setFaqs([...faqs, { pregunta: "", respuesta: "" }])}>Agregar pregunta</Button></fieldset>}<div className="flex flex-wrap gap-6">{[["publicado", "Publicado"], ["destacado", "Destacado"]].map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" name={key} defaultChecked={row[key] === true}/>{label}</label>)}</div><Message state={state}/><Submit pending={pending}/></form>;
}
