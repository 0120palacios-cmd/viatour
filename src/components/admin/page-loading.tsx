// Shown inside the admin shell while a section loads, so the navigation stays in place.
export function AdminPageLoading() {
  return <div role="status" aria-live="polite" className="space-y-6">
    <span className="sr-only">Cargando…</span>
    <div className="space-y-3" aria-hidden="true"><div className="h-9 w-56 animate-pulse rounded-btn bg-line" /><div className="h-5 w-80 max-w-full animate-pulse rounded-btn bg-line/70" /></div>
    <div className="h-12 w-full animate-pulse rounded-btn bg-line/70" aria-hidden="true" />
    <div className="divide-y divide-line rounded-card border border-line bg-canvas" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div key={i} className="flex items-center justify-between gap-6 p-4 sm:px-6"><div className="flex-1 space-y-2"><div className="h-4 w-48 animate-pulse rounded-btn bg-line" /><div className="h-3 w-72 max-w-full animate-pulse rounded-btn bg-line/70" /></div><div className="h-4 w-20 animate-pulse rounded-btn bg-line" /></div>)}</div>
  </div>;
}
