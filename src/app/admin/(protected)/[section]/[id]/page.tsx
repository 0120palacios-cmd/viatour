import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ section: string; id?: string }> }) { const { section, id } = await params; const url = "/admin/" + section + (id ? "/" + id : ""); return pageMetadata(url, "viatour | Administración de " + section + (id ? " / " + id : ""), "Administración privada de " + section + (id ? ". Registro " + id : "") + ". Contenido excluido de la indexación pública."); }
import {FAQForm} from "@/components/admin/faq-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, adminRows } from "@/lib/admin";
import { BlogForm } from "@/components/admin/blog-form";
import { ContentForm } from "@/components/admin/forms";
export default async function Page({ params }: {
    params: Promise<{
        section: string;
        id: string;
    }>;
}) {
    const { section, id } = await params;
    const { client } = await requireAdmin();
    if (!["paquetes", "destinos", "blog", "faq"].includes(section))
        notFound();
    const table = section === "faq" ? "faqs" : section === "paquetes" ? "packages" : section === "blog" ? "blog_posts" : "destinations";
    let row: Record<string, unknown> = {};
    if (id !== "nuevo") {
        if (!/^[0-9a-f-]{36}$/i.test(id))
            notFound();
        const result = await client.from(table).select("*").eq("id", id).maybeSingle();
        if (result.error)
            throw Error("No se pudo cargar el registro.");
        if (!result.data)
            notFound();
        row = result.data;
    }
    const destinations = table === "packages" ? await adminRows("destinations") : [];
    return <><Link href={`/admin/${section}`} className="text-brand underline">Volver a {section}</Link><h1 className="t-h1 my-6">{id === "nuevo" ? "Crear" : "Editar"} {table === "faqs" ? "pregunta frecuente" : table === "packages" ? "paquete" : table === "blog_posts" ? "publicación" : "destino"}</h1>{table === "faqs" ? <FAQForm row={row}/> : table === "blog_posts" ? <BlogForm row={row}/> : <ContentForm table={table} row={row} destinations={destinations}/>}</>;
}
