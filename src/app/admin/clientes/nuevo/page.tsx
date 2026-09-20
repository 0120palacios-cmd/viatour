import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { CustomerForm } from "@/components/admin/customer-form";
import { requireAdmin } from "@/lib/admin";

export const metadata = pageMetadata("/admin/clientes/nuevo", "viatour | Crear cliente", "Crear un cliente en la administración privada de viatour.");

export default async function NewCustomerPage() {
  await requireAdmin();
  return <div><Link href="/admin/clientes" className="text-brand underline underline-offset-4">Volver a clientes</Link><h1 className="t-h1 my-6">Crear cliente</h1><CustomerForm /></div>;
}
