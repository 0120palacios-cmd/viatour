import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin, adminRows } from "@/lib/admin";
import { ContentForm } from "@/components/admin/forms";
export default async function Page({ params }: {
    params: Promise<{
        section: string;
        id: string;
    }>;
}) {
    const { section, id } = await params;
    const { client } = await requireAdmin();
    if (!["paquetes", "destinos"].includes(section))
        notFound();
    const table = section === "paquetes" ? "packages" : "destinations";
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
    return <><Link href={`/admin/${section}`} className="text-brand underline">Volver a {section}</Link><h1 className="t-h1 my-6">{id === "nuevo" ? "Crear" : "Editar"} {table === "packages" ? "paquete" : "destino"}</h1><ContentForm table={table} row={row} destinations={destinations}/></>;
}
