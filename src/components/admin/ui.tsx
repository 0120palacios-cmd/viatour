import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";

// Shared building blocks for every admin page: one header, one search bar, one filter row, one badge,
// one empty state, one record list. Pages compose these instead of restyling each piece.

export function PageHeader({ title, description, actions, back, eyebrow }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string }; eyebrow?: React.ReactNode }) {
  return <header className="space-y-4">
    {back ? <Link href={back.href} className="t-small inline-flex min-h-11 items-center gap-2 text-brand hover:text-brand-deep"><ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />{back.label}</Link> : null}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? <p className="t-small text-ink-soft">{eyebrow}</p> : null}
        <h1 className="t-h1 break-words">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  </header>;
}

export type Tone = "neutral" | "info" | "success" | "danger" | "muted";
const tones: Record<Tone, string> = {
  neutral: "border-line bg-surface text-ink",
  info: "border-transparent bg-brand-tint text-brand-deep",
  success: "border-success/30 bg-canvas text-success",
  danger: "border-error/30 bg-canvas text-error",
  muted: "border-line bg-canvas text-ink-soft",
};

export function StatusBadge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`t-small inline-flex items-center whitespace-nowrap rounded-btn border px-2 py-0.5 font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SearchForm({ id, action, placeholder, defaultValue, hidden = {} }: { id: string; action: string; placeholder: string; defaultValue?: string; hidden?: Record<string, string | undefined> }) {
  return <form role="search" action={action} className="flex gap-2">
    {Object.entries(hidden).map(([name, value]) => value ? <input key={name} type="hidden" name={name} value={value} /> : null)}
    <label className="sr-only" htmlFor={id}>{placeholder}</label>
    <div className="relative min-w-0 flex-1">
      <Search size={18} strokeWidth={1.75} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
      <input id={id} type="search" name="q" defaultValue={defaultValue} placeholder={placeholder} className="h-12 w-full rounded-btn border border-line bg-canvas pl-10 pr-3 text-ink focus-visible:border-brand" />
    </div>
    <button type="submit" className="min-h-12 rounded-btn border border-line px-4 font-semibold text-ink hover:bg-surface sm:px-6">Buscar</button>
  </form>;
}

export type FilterItem = { href: string; label: string; current: boolean; count?: number };

export function FilterNav({ label, items }: { label: string; items: FilterItem[] }) {
  return <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
    <ul className="chip-row flex gap-2 sm:flex-wrap">
      {items.map(item => <li key={item.href + item.label}><Link href={item.href} aria-current={item.current ? "page" : undefined} className="t-small inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-btn border border-line px-3 text-ink-soft hover:border-brand hover:text-brand aria-[current=page]:border-brand aria-[current=page]:bg-brand-tint aria-[current=page]:font-semibold aria-[current=page]:text-brand-deep">{item.label}{item.count != null ? <span className="tabular-nums">{item.count}</span> : null}</Link></li>)}
    </ul>
  </nav>;
}

export function EmptyState({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="rounded-card border border-dashed border-line bg-canvas px-6 py-12 text-center">
    <p className="t-h3">{title}</p>
    {description ? <p className="mx-auto mt-2 max-w-md text-ink-soft">{description}</p> : null}
    {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
  </div>;
}

// A list of records in one bordered panel, one row per record: denser than a card per record and
// easier to scan. Each row stacks on a phone.
export function RecordList({ label, children }: { label: string; children: React.ReactNode }) {
  return <ul aria-label={label} className="divide-y divide-line overflow-hidden rounded-card border border-line bg-canvas">{children}</ul>;
}

export function RecordRow({ href, title, badges, meta, aside, actions, icon }: { href?: string; title: React.ReactNode; badges?: React.ReactNode; meta?: React.ReactNode; aside?: React.ReactNode; actions?: React.ReactNode; icon?: React.ReactNode }) {
  return <li className="relative flex flex-col gap-3 p-4 hover:bg-surface sm:flex-row sm:items-center sm:gap-6 sm:px-6">
    <div className="flex min-w-0 flex-1 gap-3">
      {icon ? <span className="mt-0.5 shrink-0 text-brand" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? <Link href={href} className="block font-semibold text-ink after:absolute after:inset-0 hover:text-brand focus-visible:outline-none focus-visible:after:rounded-card focus-visible:after:ring-2 focus-visible:after:ring-brand">{title}</Link> : <span className="font-semibold text-ink">{title}</span>}
          {badges}
        </div>
        {meta ? <div className="t-small mt-1 break-words text-ink-soft">{meta}</div> : null}
      </div>
    </div>
    {aside || actions ? <div className="flex items-center justify-between gap-3 sm:contents">
      {aside ? <div className="min-w-0 sm:shrink-0 sm:text-right">{aside}</div> : <span />}
      {actions ? <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div> : null}
  </li>;
}

export function Pagination({ label, previous, next, summary }: { label: string; previous?: string; next?: string; summary?: string }) {
  if (!previous && !next && !summary) return null;
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-4">
    <p className="t-small text-ink-soft">{summary}</p>
    <div className="flex gap-2">
      {previous ? <Link href={previous} className="inline-flex min-h-11 items-center rounded-btn border border-line px-4 text-ink hover:bg-surface">Anterior</Link> : null}
      {next ? <Link href={next} className="inline-flex min-h-11 items-center rounded-btn border border-line px-4 text-ink hover:bg-surface">Siguiente</Link> : null}
    </div>
  </nav>;
}

export function Panel({ title, description, action, children, id }: { title: string; description?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; id?: string }) {
  const headingId = id ?? `panel-${title.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-")}`;
  return <section aria-labelledby={headingId} className="rounded-card border border-line bg-canvas">
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
      <div className="min-w-0"><h2 id={headingId} className="t-h3">{title}</h2>{description ? <p className="t-small mt-1 text-ink-soft">{description}</p> : null}</div>
      {action}
    </div>
    {children}
  </section>;
}

export const primaryLink = "inline-flex min-h-12 items-center justify-center gap-2 rounded-btn bg-brand px-5 font-semibold text-white hover:bg-brand-deep";
export const secondaryLink = "inline-flex min-h-12 items-center justify-center gap-2 rounded-btn border border-line px-5 font-semibold text-ink hover:bg-surface";
export const textLink = "text-brand underline underline-offset-4 hover:text-brand-deep";

const day = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeZone: "America/Tegucigalpa" });
export function formatDay(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  // Plain dates (YYYY-MM-DD) are calendar days: read them at noon so no time zone moves them.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-06:00` : value);
  return Number.isNaN(date.getTime()) ? "Sin fecha" : day.format(date);
}
