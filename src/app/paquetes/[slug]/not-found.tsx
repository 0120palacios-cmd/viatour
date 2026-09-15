import Link from "next/link";
export default function NotFound() {
  // Copy funcional pendiente de aprobación final.
  return <main className="container-site space-y-6 py-14 text-center sm:py-24"><h1 className="t-h1">Paquete no disponible</h1><p className="t-body text-ink-soft">El paquete que busca no está disponible.</p><Link href="/paquetes" className="t-small text-brand underline underline-offset-4">Volver a paquetes</Link></main>;
}
