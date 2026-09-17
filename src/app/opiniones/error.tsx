"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="container-site space-y-6 py-14 sm:py-24"><h1 className="t-h1">Opiniones</h1><p role="alert">No se pudieron cargar las opiniones. Inténtelo de nuevo.</p><Button onClick={reset}>Volver a intentar</Button></main>; }
