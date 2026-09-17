export function suggestSlug(title: string) { return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
export function blogDate(date: string | null) { return date ? new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z")) : ""; }
export function blogCoverUrl(value: string | null) { if (!value)
    return null; try {
    const base = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    const url = new URL(value, base);
    return url.origin === base.origin && url.protocol === "https:" && url.pathname.startsWith("/storage/v1/object/public/blog-images/") ? url.href : null;
}
catch {
    return null;
} }
