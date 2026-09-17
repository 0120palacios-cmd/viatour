import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("/admin/login", "viatour | Iniciar sesión en administración", "Acceso privado a la administración de viatour. Esta página no está disponible para indexación pública.");
import { LoginForm } from "@/components/admin/forms";
export default function Page() { return <main className="container-site py-12"><div className="mx-auto max-w-lg space-y-6 rounded-panel border p-6"><h1 className="t-h1">Iniciar sesión</h1><LoginForm /></div></main>; }
