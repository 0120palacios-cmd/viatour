"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: {
    reset: () => void;
}) { return <div className="container-site py-12 space-y-6"><h1 className="t-h2">No se pudo cargar la administración</h1><p role="alert">Intente nuevamente. Si el problema continúa, revise su conexión y su acceso.</p><Button onClick={reset}>Intentar nuevamente</Button></div>; }
