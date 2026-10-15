import { PageHeader } from "@/components/admin/ui";
import { pageMetadata } from "@/lib/seo";
import { requireAdmin } from "@/lib/admin";
import { QuotationEditor } from "@/components/admin/quotation-editor/editor";
import { initialDraft } from "@/components/admin/quotation-editor/draft";
import { leadQuotationPrefill } from "@/lib/lead-admin";
import { recentQuotationHotels } from "@/lib/quotation-data";
import { editorCatalogs } from "@/lib/catalog-data";
import { creatableKinds, type QuotationKind } from "@/lib/quotation-details";
import { validUuid } from "@/lib/quotation-validation";
import type { Customer } from "@/lib/quotation-types";

export const metadata = pageMetadata("/admin/cotizaciones/nuevo", "viatour | Crear cotización", "Crear una cotización en la administración privada de viatour.");

function kindFromService(service: unknown): QuotationKind | null {
  const value = String(service ?? "").toLowerCase();
  if (value.includes("vuelo")) return "vuelo";
  if (value.includes("hotel")) return "hotel";
  if (value.includes("paquete")) return "combinado";
  if (value.includes("ferry")) return "ferry";
  return null;
}

export default async function NewQuotationPage({ searchParams }: { searchParams: Promise<{ lead?: string; tipo?: string; cliente?: string }> }) {
  const { client } = await requireAdmin();
  const { lead, tipo, cliente } = await searchParams;
  const [customers, recentHotels, schema, catalogs] = await Promise.all([
    client.from("customers").select("id,nombre,email,telefono,notas").order("nombre", { ascending: true }).limit(1000),
    recentQuotationHotels(client),
    client.from("quotations").select("tipo").limit(1),
    editorCatalogs(client),
  ]);
  if (customers.error) throw new Error("No se pudieron cargar los clientes.");
  // New quotations use the kinds offered today; an old "?tipo=paquete" link opens the combined package.
  const requested = tipo === "paquete" ? "combinado" : tipo;
  let kind: QuotationKind = creatableKinds.includes(requested as QuotationKind) ? requested as QuotationKind : "vuelo";
  let draft = initialDraft(kind);
  let fromLead = false;
  if (lead && validUuid(lead)) {
    const row = await client.from("leads").select("*").eq("id", lead).maybeSingle();
    if (row.data) {
      const prefill = leadQuotationPrefill(row.data);
      fromLead = true;
      if (!tipo) kind = kindFromService(row.data.servicio) ?? kind;
      draft = initialDraft(kind);
      // What the visitor wrote stays internal: the customer-facing observations start empty.
      draft = { ...draft, leadId: prefill.leadId, cliente: { nombre: prefill.nombre, email: prefill.email, telefono: prefill.telefono }, destino: prefill.destino, detalles: { ...draft.detalles, notasInternas: prefill.notas } };
    }
  }
  // Started from a customer's profile: link the quotation to that customer from the first save.
  let fromCustomer = "";
  if (!fromLead && cliente && validUuid(cliente)) {
    const customer = ((customers.data ?? []) as Customer[]).find(item => item.id === cliente) ?? (await client.from("customers").select("id,nombre,email,telefono,notas").eq("id", cliente).maybeSingle()).data as Customer | null;
    if (customer) {
      fromCustomer = customer.id;
      draft = { ...draft, customerId: customer.id, cliente: { nombre: customer.nombre, email: customer.email, telefono: customer.telefono ?? "" } };
    }
  }
  const back = fromLead ? { href: "/admin/leads", label: "Leads" } : fromCustomer ? { href: `/admin/clientes/${fromCustomer}`, label: draft.cliente.nombre } : { href: "/admin/cotizaciones", label: "Cotizaciones" };
  return <>
    <PageHeader back={back} title="Crear cotización" />
    {fromLead ? <p className="rounded-card border border-line bg-brand-tint p-4 text-ink">Datos precargados desde el lead. Lo que escribió el cliente quedó en las notas internas; revise el correo, que es necesario para enviar la cotización.</p> : null}
    <QuotationEditor initial={draft} customers={(customers.data ?? []) as Customer[]} recentHotels={recentHotels} meta={{ schemaReady: !schema.error }} catalogs={catalogs} />
  </>;
}
