"use client";
import { useActionState, useState } from "react";
import { save } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/blog/markdown";
import { suggestSlug } from "@/lib/blog-utils";
const control = "w-full rounded-btn border bg-canvas p-3 text-ink focus-visible:border-brand";
export function BlogForm({ row = {} }: {
    row?: Record<string, unknown>;
}) {
    const [state, action, pending] = useActionState(save, {});
    const [slug, setSlug] = useState(String(row.slug ?? ""));
    const [manual, setManual] = useState(Boolean(row.id));
    const [body, setBody] = useState(String(row.cuerpo ?? ""));
    const [cover, setCover] = useState(String(row.cover_url ?? ""));
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    async function upload(file?: File) { if (!file)
        return; setUploading(true); setUploadError(""); try {
        const data = new FormData();
        data.set("file", file);
        const response = await fetch("/api/admin/blog-images", { method: "POST", body: data });
        const result = await response.json();
        if (!response.ok)
            throw Error(result.error || "No se pudo subir la portada.");
        setCover(result.url);
    }
    catch (error) {
        setUploadError(error instanceof Error ? error.message : "No se pudo subir la portada.");
    }
    finally {
        setUploading(false);
    } }
    return <form action={action} className="space-y-6 rounded-panel border bg-surface p-6"><input type="hidden" name="table" value="blog_posts"/><input type="hidden" name="id" value={String(row.id ?? "")}/><p className="t-small text-ink-soft">Los campos con * son obligatorios. Las publicaciones nuevas se guardan como borradores hasta que usted marque Publicado.</p><div className="grid gap-6 sm:grid-cols-2"><label className="t-small">Título *<Input name="titulo" required defaultValue={String(row.titulo ?? "")} onChange={e => { if (!manual)
        setSlug(suggestSlug(e.target.value)); }}/></label><label className="t-small">Slug *<Input name="slug" required value={slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => { setManual(true); setSlug(e.target.value); }}/></label><label className="t-small">Categoría *<Input name="categoria" required defaultValue={String(row.categoria ?? "")}/></label><label className="t-small">Tipo<select className={control} name="tipo" defaultValue={String(row.tipo ?? "post")}><option value="post">Artículo</option><option value="guia">Guía</option></select></label>{[["autor", "Autor"], ["meta_titulo", "Título SEO"]].map(([name, label]) => <label className="t-small" key={name}>{label}<Input name={name} defaultValue={String(row[name] ?? "")}/></label>)}<label className="t-small">Fecha de publicación<Input type="date" name="publicado_en" defaultValue={String(row.publicado_en ?? "")}/></label><label className="t-small">Orden *<Input type="number" step="1" required name="orden" defaultValue={Number(row.orden ?? 0)}/></label></div>{[["extracto", "Extracto *"], ["meta_descripcion", "Descripción SEO"]].map(([name, label]) => <label className="block t-small" key={name}>{label}<textarea className={control} name={name} required={name === "extracto"} rows={4} defaultValue={String(row[name] ?? "")}/></label>)}<label className="block t-small">Cuerpo (Markdown) *<textarea name="cuerpo" className={control} rows={16} required value={body} onChange={e => setBody(e.target.value)}/></label><details className="rounded-card border bg-canvas p-6"><summary className="cursor-pointer text-brand">Vista previa de Markdown</summary><div className="mt-6"><Markdown>{body}</Markdown></div></details><label className="block t-small">Portada (JPEG, PNG o WebP; máximo 5 MB)<Input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => void upload(e.target.files?.[0])}/></label><label className="block t-small">URL de portada en blog-images<Input name="cover_url" type="url" value={cover} onChange={e => setCover(e.target.value)}/></label><div role="status">{uploading && "Subiendo portada…"}</div>{uploadError && <p role="alert" className="text-error">{uploadError}</p>}<div className="flex flex-wrap gap-6">{[["destacado", "Destacado"], ["publicado", "Publicado"]].map(([name, label]) => <label key={name} className="flex items-center gap-2"><input name={name} type="checkbox" defaultChecked={row[name] === true}/>{label}</label>)}</div><div aria-live="polite">{state.error && <p role="alert" className="text-error">{state.error}</p>}{state.success && <p>{state.success}</p>}</div><Button disabled={pending || uploading}>{pending ? "Guardando…" : "Guardar cambios"}</Button></form>;
}
