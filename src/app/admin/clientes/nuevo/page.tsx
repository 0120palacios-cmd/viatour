import { pageMetadata } from "@/lib/seo";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin";

export const metadata = pageMetadata("/admin/clientes/nuevo", "viatour | Crear cliente", "Crear un cliente en la administración privada de viatour.");

export default async function NewCustomerPage() {
  await requireAdmin();
  return <>
    <PageHeader back={{ href: "/admin/clientes", label: "Clientes" }} title="Crear cliente" description="Después de crearlo podrá prepararle una cotización desde su ficha. También puede crear el cliente directamente al escribir una cotización." />
    <CustomerForm />
  </>;
}
