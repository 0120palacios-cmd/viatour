import { blogCoverUrl } from "./blog-utils";
export function validateBlog(form: FormData): {
    values?: Record<string, unknown>;
    error?: string;
} {
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const caps: Record<string, number> = { titulo: 200, slug: 200, categoria: 120, extracto: 2000, cuerpo: 100000, cover_url: 2048, autor: 120, meta_titulo: 200, meta_descripcion: 500, publicado_en: 10 };
    if (Object.entries(caps).some(([key, max]) => get(key).length > max)) return { error: "Revise la longitud de los campos." };
    if (!get("titulo") || !get("categoria") || !get("extracto") || !get("cuerpo") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(get("slug")))
        return { error: "Complete los campos obligatorios y use un slug con minúsculas, números y guiones." };
    if (!["post", "guia"].includes(get("tipo")))
        return { error: "Seleccione un tipo válido." };
    if (!/^-?\d+$/.test(get("orden")) || !Number.isSafeInteger(Number(get("orden"))))
        return { error: "El orden debe ser un número entero." };
    const date = get("publicado_en");
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date))
        return { error: "Ingrese una fecha válida." };
    if (form.get("publicado") === "on" && !date)
        return { error: "Indique la fecha de publicación antes de publicar." };
    if (get("cover_url") && !blogCoverUrl(get("cover_url")))
        return { error: "La portada debe pertenecer al bucket blog-images de este proyecto." };
    const values: Record<string, unknown> = {};
    for (const key of ["titulo", "slug", "categoria", "tipo", "extracto", "cuerpo", "cover_url", "autor", "meta_titulo", "meta_descripcion", "publicado_en"])
        values[key] = get(key) || null;
    values.orden = Number(get("orden"));
    values.publicado = form.get("publicado") === "on";
    values.destacado = form.get("destacado") === "on";
    return { values };
}
