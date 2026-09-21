"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="container-site py-14 sm:py-24"><div className="space-y-6 rounded-panel border border-line bg-surface p-8 text-center"><h1 className="t-h1">No pudimos cargar el contenido.</h1><p role="alert" className="t-body text-ink-soft">Intente de nuevo.</p><Button onClick={reset}>Intente de nuevo</Button></div></main>;
}
