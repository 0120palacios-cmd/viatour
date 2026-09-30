import { requireAdmin } from "@/lib/admin";
import { signOut } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { AdminNav } from "./admin-nav";

// Shared chrome for every signed-in admin route: the (protected) group and the sections that live
// beside it (clientes, cotizaciones, …) re-export this as their layout, so all of them get the same
// gutters and navigation on a phone.
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return <main className="container-site py-8 sm:py-12"><header className="mb-6 flex flex-wrap items-center justify-between gap-4 sm:mb-8"><div className="min-w-0"><p className="t-h2">Administración</p><p className="t-small text-ink-soft break-all">{user.email}</p></div><form action={signOut}><Button variant="ghost">Cerrar sesión</Button></form></header><AdminNav />{children}</main>;
}
