import Link from "next/link";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo";
import { CustomerForm } from "@/components/admin/customer-form";
import { requireAdmin } from "@/lib/admin";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return pageMetadata(`/admin/clientes/${(await params).id}`, "viatour | Editar cliente", "Editar un cliente en la administración privada de viatour.");
}

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { client } = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await client.from("customers").select("id,nombre,email,telefono,notas").eq("id", id).maybeSingle();
  if (result.error) throw new Error("No se pudo cargar el cliente.");
  if (!result.data) notFound();
  return <div><Link href="/admin/clientes" className="text-brand underline underline-offset-4">Volver a clientes</Link><h1 className="t-h1 my-6">Editar cliente</h1><CustomerForm row={result.data} /></div>;
}
