import type { Metadata } from "next";
export const metadata: Metadata = { title: "viatour | Administración", description: "Área privada de administración de viatour.", robots: { index: false, follow: false }, alternates: { canonical: null } };
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return children; }
