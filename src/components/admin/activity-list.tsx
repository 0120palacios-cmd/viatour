import Link from "next/link";
import type { ActivityLine } from "@/lib/activity";

const dateTime = new Intl.DateTimeFormat("es-HN", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Tegucigalpa" });

// One line per event: when, who, what, and a link to the record when there is one.
export function ActivityList({ lines, showLinks = true }: { lines: ActivityLine[]; showLinks?: boolean }) {
  return <ol className="divide-y divide-line">{lines.map(line => <li key={line.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4 sm:px-6">
    <p className="t-small tabular-nums text-ink-soft">{dateTime.format(new Date(line.at))}</p>
    <p className="min-w-0">
      <span className="text-ink">{line.text}</span>
      {line.reference ? <span className="t-small text-ink-soft"> · {line.reference}</span> : null}
      <span className="t-small text-ink-soft"> · {line.who}</span>
      {showLinks && line.href ? <> · <Link href={line.href} className="t-small text-brand underline underline-offset-4">Abrir</Link></> : null}
    </p>
  </li>)}</ol>;
}
