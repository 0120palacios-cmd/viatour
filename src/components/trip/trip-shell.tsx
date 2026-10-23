import Image from "next/image";
import { CalendarDays, FileText, Home, MapPin, MessagesSquare, Plane, Users } from "lucide-react";
import { formatDateRange } from "@/lib/trip-format";
import type { LoadedTrip } from "@/lib/trip-model";
import type { ChatSummary } from "@/lib/trip-chat";
import { capitalized, type T, type TripLinks, type TripSection } from "@/components/trip/trip-ui";

// Mi viaje's navigation. On a phone, a bottom tab bar with the five places travellers return to (thumb
// reach, safe-area aware); the travellers list is one tap from the summary and from documents. From lg
// up, one row of tabs under the trip header with all six. Each tab is a real page, so the back button,
// deep links and screen readers behave as on any site.

type Tab = { key: TripSection; icon: typeof Home; label: string; mobile: boolean };

function tabs(t: T): Tab[] {
  return [
    { key: "resumen", icon: Home, label: t("sections.resumen"), mobile: true },
    { key: "itinerario", icon: CalendarDays, label: t("sections.itinerario"), mobile: true },
    { key: "viajeros", icon: Users, label: t("sections.viajeros"), mobile: false },
    { key: "documentos", icon: FileText, label: t("sections.documentos"), mobile: true },
    { key: "destino", icon: MapPin, label: t("sections.destino"), mobile: true },
    { key: "mensajes", icon: MessagesSquare, label: t("sections.mensajes"), mobile: true },
  ];
}

export function TripTabs({ section, links, chat, t }: { section: TripSection; links: TripLinks; chat: ChatSummary; t: T }) {
  return <nav aria-label={t("nav.label")} className="hidden border-b border-line lg:block">
    <ul className="flex gap-1">{tabs(t).map(tab => {
      const active = tab.key === section;
      return <li key={tab.key}><a href={tab.key === "mensajes" ? links.messages : links.section(tab.key)} aria-current={active ? "page" : undefined} className={`t-small relative -mb-px inline-flex min-h-12 items-center gap-2 border-b-2 px-4 font-semibold transition-colors duration-(--duration-fast) ${active ? "border-brand text-ink" : "border-transparent text-ink-soft hover:border-line hover:text-ink"}`}>
        <tab.icon size={18} strokeWidth={1.75} className={active ? "text-brand" : ""} aria-hidden="true" />{tab.label}
        {tab.key === "mensajes" && chat.unread ? <span className="rounded-btn bg-brand px-1.5 text-[12px] leading-5 text-white"><span className="sr-only">{t("quick.unread", { count: chat.unread })}: </span>{chat.unread}</span> : null}
      </a></li>;
    })}</ul>
  </nav>;
}

export function TripBottomBar({ section, links, chat, t }: { section: TripSection; links: TripLinks; chat: ChatSummary; t: T }) {
  return <nav aria-label={t("nav.label")} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
    <ul className="mx-auto grid max-w-xl grid-cols-5">{tabs(t).filter(tab => tab.mobile).map(tab => {
      const active = tab.key === section || (section === "viajeros" && tab.key === "resumen");
      return <li key={tab.key}>
        <a href={tab.key === "mensajes" ? links.messages : links.section(tab.key)} aria-current={tab.key === section ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] font-semibold leading-4 tracking-[-0.01em] transition-colors duration-(--duration-fast) ${active ? "text-brand" : "text-ink-soft hover:text-ink"}`}>
          <span className="relative" aria-hidden="true">
            <tab.icon size={22} strokeWidth={active ? 2 : 1.75} />
            {tab.key === "mensajes" && chat.unread ? <span className="absolute -right-2.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full bg-brand text-[11px] font-bold text-white ring-2 ring-canvas">{chat.unread}</span> : null}
          </span>
          <span className="max-w-full truncate">{tab.label}</span>
          {tab.key === "mensajes" && chat.unread ? <span className="sr-only">{t("quick.unread", { count: chat.unread })}</span> : null}
        </a>
      </li>;
    })}</ul>
  </nav>;
}

// The trip at a glance on every page but the summary: where, when, which reservation.
export async function TripStrip({ trip, locale, t }: { trip: LoadedTrip; locale: string; t: T }) {
  const { view } = trip;
  const dates = capitalized(formatDateRange(view.start, view.end, locale)) || t("datesToConfirm");
  return <div className="flex items-center gap-3">
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-card bg-brand-deep text-white" aria-hidden="true">
      {trip.image ? <Image src={trip.image.src} alt="" fill sizes="48px" className="object-cover" /> : <Plane size={20} strokeWidth={1.75} className="rotate-45" />}
    </span>
    <div className="min-w-0">
      <p className="truncate font-bold leading-6 text-ink">{view.destination}</p>
      <p className="t-small truncate font-normal text-ink-soft">{dates} · {t("reference", { code: view.reference })}</p>
    </div>
  </div>;
}

export function PageTitle({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2"><h1 id={id} className="t-h1">{title}</h1>{children}</div>;
}
