import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "./admin-nav";

// Shared chrome for every signed-in admin route: the (protected) group and the sections that live
// beside it (clientes, cotizaciones, …) re-export this as their layout. A sidebar from 1024px; a top
// bar with a menu sheet below that.
export default async function AdminShell({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();
  return <div className="min-h-dvh bg-surface lg:flex">
    <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-canvas focus:px-4 focus:py-3 focus:shadow-md">Saltar al contenido</a>
    <AdminNav email={user.email ?? ""} />
    <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
      <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
    </main>
  </div>;
}
