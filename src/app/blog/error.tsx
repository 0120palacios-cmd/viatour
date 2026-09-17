"use client";
import { Button } from "@/components/ui/button";
export default function Error({ reset }: {
    reset: () => void;
}) { return <main className="container-site py-14 sm:py-24"><h1 className="t-h1">No se pudieron cargar las publicaciones.</h1><Button className="mt-6" onClick={reset}>Intentar nuevamente</Button></main>; }
