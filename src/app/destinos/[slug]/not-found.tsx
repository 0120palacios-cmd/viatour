import Link from "next/link";
export default function NotFound() {
  // Copy funcional pendiente de aprobación final.
  return <main className="container-site space-y-6 py-14 text-center sm:py-24"><h1 className="t-h1">Destino no disponible</h1><p className="t-body text-ink-soft">El destino que busca no está disponible.</p><Link href="/destinos" className="t-small text-brand underline underline-offset-4">Volver a destinos</Link></main>;
}
