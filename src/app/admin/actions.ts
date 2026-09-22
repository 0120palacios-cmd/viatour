"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { validateBlog } from "@/lib/blog-validation";
export type Result = {
    error?: string;
    success?: string;
};
export async function login(_: Result, form: FormData): Promise<Result> {
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password)
        return { error: "Ingrese su correo y contraseña." };
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error)
        return { error: "No se pudo iniciar sesión. Revise sus credenciales." };
    const admin = await client.rpc("is_admin");
    if (admin.error || admin.data !== true) {
        await client.auth.signOut();
        return { error: "Su cuenta no tiene acceso a la administración." };
    }
    redirect("/admin");
}
export async function signOut() {
    const client = await createClient();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("No se pudo cerrar su sesión. Intente nuevamente.");
    revalidatePath("/admin", "layout");
    redirect("/admin/login");
}
export async function save(_: Result, form: FormData): Promise<Result> {
    const { client } = await requireAdmin();
    const table = String(form.get("table"));
    if (!["reviews", "packages", "destinations", "leads", "blog_posts", "faqs"].includes(table))
        return { error: "Registro inválido." };
    const id = String(form.get("id") ?? "");
    if (id && !/^[0-9a-f-]{36}$/i.test(id))
        return { error: "Registro inválido." };
    const remove = form.get("operation") === "delete";
    if (remove && (!id || !["packages", "destinations", "blog_posts", "faqs"].includes(table)))
        return { error: "Acción inválida." };
    let previousSlug: string | undefined;
    if (id && ["packages", "destinations", "blog_posts"].includes(table)) {
        const previous = await client.from(table).select("slug").eq("id", id).single();
        if (previous.error)
            return { error: "No se encontró el registro." };
        previousSlug = previous.data.slug;
    }
    const values: Record<string, unknown> = {};
    const get = (key: string) => String(form.get(key) ?? "").trim();
    if (!remove) {
        if(table === "faqs") {
            if(!get("pregunta")||get("pregunta").length>500||!get("respuesta")||get("respuesta").length>10000||get("categoria").length>120)return {error:"Complete la pregunta y la respuesta; revise la longitud de los campos."};
            if(!/^-?\d+$/.test(get("orden"))||!Number.isSafeInteger(Number(get("orden"))))return {error:"El orden debe ser un número entero."};
            Object.assign(values,{pregunta:get("pregunta"),respuesta:get("respuesta"),categoria:get("categoria")||null,publicado:form.get("publicado")==="on",orden:Number(get("orden"))});
        }
        else if (table === "blog_posts") {
            const result = validateBlog(form);
            if (result.error) return { error: result.error };
            Object.assign(values, result.values);
            const existing = await client.from("blog_posts").select("id").eq("slug", values.slug).maybeSingle();
            if (existing.error) return { error: "No se pudo verificar el slug. Intente nuevamente." };
            if (existing.data && existing.data.id !== id) return { error: "Ese slug ya existe. Elija otro." };
        }
        else if (table === "reviews" || table === "leads") {
            const allowed = table === "reviews" ? ["pendiente", "aprobada", "rechazada", "despublicada"] : ["nuevo", "contactado", "cerrado"];
            const state = get("accion_estado") || get("estado");
            if (!id || !allowed.includes(state))
                return { error: "Seleccione un estado válido." };
            values.estado = state;
            if (table === "reviews")
                values.verificada = form.get("verificada") === "on";
        }
        else {
            const caps: Record<string, number> = { nombre: 200, slug: 200, destino: 200, destination_id: 36, resumen: 2000, descripcion: 20000, duracion: 200, moneda: 3, imagen_url: 2048, titulo_seo: 200, meta_descripcion: 500, intro: 3000, cuerpo: 100000, mejor_epoca: 2000, incluye: 20000 };
            if (Object.entries(caps).some(([key, max]) => get(key).length > max)) return { error: "Revise la longitud de los campos." };
            if (table === "packages" && get("destination_id") && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(get("destination_id"))) return { error: "Seleccione un destino válido." };
            const includes = get("incluye").split("\n").map(v => v.trim()).filter(Boolean);
            const qs = form.getAll("pregunta"), ans = form.getAll("respuesta");
            if (includes.length > 50 || includes.some(v => v.length > 500) || qs.length > 30 || ans.length !== qs.length || qs.some(v => String(v).length > 500) || ans.some(v => String(v).length > 10000)) return { error: "Revise la cantidad y la longitud de los campos." };
            const fields = table === "packages" ? ["nombre", "slug", "destino", "destination_id", "resumen", "descripcion", "duracion", "moneda", "imagen_url"] : ["nombre", "slug", "titulo_seo", "meta_descripcion", "intro", "cuerpo", "mejor_epoca", "imagen_url"];
            for (const key of fields)
                values[key] = get(key) || (key === "destination_id" || key === "imagen_url" || table === "destinations" && !["nombre", "slug"].includes(key) ? null : "");
            if (!get("nombre") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(get("slug")))
                return { error: "Ingrese un nombre y un slug válido (minúsculas, números y guiones)." };
            if (get("imagen_url")) {
                try {
                    const url = new URL(get("imagen_url"));
                    if (url.protocol !== "https:")
                        throw Error();
                }
                catch {
                    return { error: "La imagen debe usar una URL HTTPS válida." };
                }
            }
            if (!/^-?\d+$/.test(get("orden")) || !Number.isSafeInteger(Number(get("orden"))))
                return { error: "El orden debe ser un número entero." };
            values.orden = Number(get("orden"));
            values.publicado = form.get("publicado") === "on";
            values.destacado = form.get("destacado") === "on";
            if (table === "packages") {
                if (!["USD", "HNL"].includes(get("moneda")))
                    return { error: "Seleccione USD o HNL." };
                const price = get("precio_desde");
                if (price && (!/^\d+(\.\d{1,2})?$/.test(price) || !Number.isFinite(Number(price))))
                    return { error: "Ingrese un precio válido o deje el campo vacío." };
                values.precio_desde = price ? Number(price) : null;
                values.incluye = get("incluye").split("\n").map(v => v.trim()).filter(Boolean);
            }
            else {
                const questions = form.getAll("pregunta").map(String), answers = form.getAll("respuesta").map(String);
                if (questions.some((q, i) => Boolean(q.trim()) !== Boolean(answers[i]?.trim())))
                    return { error: "Complete la pregunta y su respuesta." };
                values.faqs = questions.flatMap((q, i) => q.trim() ? [{ pregunta: q.trim(), respuesta: answers[i].trim() }] : []);
            }
        }
    }
    const query = remove ? client.from(table).delete().eq("id", id) : id ? client.from(table).update(values).eq("id", id) : client.from(table).insert(values);
    const { data, error } = await query.select("id").single();
    if (error || !data)
        return { error: error?.code === "23505" ? "Ese slug ya existe. Elija otro." : "No se pudo guardar el registro. Revise los datos e intente nuevamente." };
    const section = ({ reviews: "opiniones", packages: "paquetes", destinations: "destinos", leads: "leads", blog_posts: "blog", faqs: "faq" } as Record<string, string>)[table];
    revalidatePath("/admin", "layout");
    if(table === "faqs") revalidatePath("/preguntas-frecuentes");
    if (table !== "leads") {
        revalidatePath("/");
        revalidatePath(`/${section}`);
        if (previousSlug)
            revalidatePath(`/${section}/${previousSlug}`);
        if (values.slug)
            revalidatePath(`/${section}/${values.slug}`);
        revalidatePath("/destinos", "layout");
        revalidatePath("/sitemap.xml");
    }
    return { success: remove ? "Registro eliminado." : "Cambios guardados." };
}
