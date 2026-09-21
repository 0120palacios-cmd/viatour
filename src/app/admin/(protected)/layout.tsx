import Link from "next/link";
import { LayoutDashboard, Star, Luggage, MapPin, ListChecks, BookOpen, CircleHelp, Users, FileText, ClipboardList, ReceiptText, MessageSquare } from "lucide-react";
import { requireAdmin } from "@/lib/admin";
import { signOut } from "../actions";
import { Button } from "@/components/ui/button";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  const sections = [["Resumen", "/admin", LayoutDashboard], ["Clientes", "/admin/clientes", Users], ["Cotizaciones", "/admin/cotizaciones", FileText], ["Reservas", "/admin/reservas", ClipboardList], ["Facturación", "/admin/facturacion", ReceiptText], ["Solicitudes", "/admin/tickets", MessageSquare], ["Opiniones", "/admin/opiniones", Star], ["Paquetes", "/admin/paquetes", Luggage], ["Destinos", "/admin/destinos", MapPin], ["Leads", "/admin/leads", ListChecks], ["Blog", "/admin/blog", BookOpen], ["FAQ", "/admin/faq", CircleHelp]] as const;
  return <main className="container-site py-12"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="t-h2">Administración</p><p className="t-small text-ink-soft break-all">{user.email}</p></div><form action={signOut}><Button variant="ghost">Cerrar sesión</Button></form></header><nav aria-label="Administración" className="mb-8 flex flex-wrap gap-4 border-b pb-4">{sections.map(([label, href, Icon]) => <Link key={href} href={href} className="flex items-center gap-2 rounded-btn p-2 text-brand hover:bg-brand-tint"><Icon size={20} strokeWidth={1.75} />{label}</Link>)}</nav>{children}</main>;
}
