import { getTranslations } from "next-intl/server";
import { Plane, Clock3 } from "lucide-react";
import { formatClock, formatMinutes, formatTripDate } from "@/lib/trip-format";
import type { JourneyView, FlightLeg } from "@/lib/trip-view";

// A journey as a vertical timeline, the way airline itineraries read on a phone: time, airport, the
// flight between them, then each connection with its wait. Times are local to each airport.
function Rail({ dashed = false, dot = false, last = false, first = false }: { dashed?: boolean; dot?: boolean; last?: boolean; first?: boolean }) {
  return <span className="relative flex justify-center" aria-hidden="true">
    <span className={`absolute w-0 border-l-2 ${dashed ? "border-dashed border-line" : "border-brand/40"} ${first ? "top-3" : "top-0"} ${last ? "h-3" : "bottom-0"}`} />
    {dot ? <span className="relative mt-1.5 size-3 rounded-full border-2 border-brand bg-canvas" /> : null}
  </span>;
}

function Stop({ time, code, city, airport, date, journeyDate, locale, first, last }: { time: string; code: string; city: string; airport: string; date: string; journeyDate: string; locale: string; first?: boolean; last?: boolean }) {
  const shifted = date && journeyDate && date !== journeyDate;
  const [clock, meridiem] = (formatClock(time, locale) || "—").split(/ (.+)/);
  return <li className="grid grid-cols-[5.25rem_1.25rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[6rem_1.5rem_minmax(0,1fr)]">
    <p className="text-right leading-6"><span className="block font-bold tabular-nums text-ink">{clock}</span>{meridiem ? <span className="t-small block font-normal text-ink-soft">{meridiem}</span> : null}</p>
    <Rail dot first={first} last={last} />
    <div className="min-w-0 pb-1">
      <p className="leading-6"><span className="font-bold text-ink">{code}</span> <span className="text-ink">{city}</span>{shifted ? <span className="t-small ml-2 rounded-btn bg-surface px-2 py-0.5 font-semibold text-ink-soft">{formatTripDate(date, locale, "short")}</span> : null}</p>
      {airport ? <p className="t-small break-words font-normal text-ink-soft">{airport}</p> : null}
    </div>
  </li>;
}

async function LegRow({ leg }: { leg: FlightLeg }) {
  const t = await getTranslations("trip.flight");
  const details = [leg.cabin ? t("cabin", { cabin: leg.cabin }) : "", leg.bookingClass ? t("class", { value: leg.bookingClass }) : "", leg.aircraft].filter(Boolean);
  return <li className="grid grid-cols-[5.25rem_1.25rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[6rem_1.5rem_minmax(0,1fr)]">
    <span />
    <Rail />
    <div className="my-2 min-w-0 rounded-card bg-surface px-4 py-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink"><Plane size={16} strokeWidth={1.75} className="shrink-0 text-brand" aria-hidden="true" />{[leg.airline, leg.flight].filter(Boolean).join(" · ")}</p>
      <p className="t-small mt-1 font-normal text-ink-soft">{[leg.durationMin !== null ? t("flightTime", { duration: formatMinutes(leg.durationMin) }) : "", ...details].filter(Boolean).join(" · ")}</p>
      {leg.operatedBy ? <p className="t-small font-normal text-ink-soft">{t("operatedBy", { airline: leg.operatedBy })}</p> : null}
    </div>
  </li>;
}

export async function FlightJourneyCard({ journey, locale }: { journey: JourneyView; locale: string }) {
  const t = await getTranslations("trip.flight");
  const title = journey.kind === "tramo" ? t("tramo", { number: journey.index + 1 }) : t(journey.kind);
  const summary = [journey.stops ? t("stops", { count: journey.stops }) : t("direct"), journey.durationMin !== null ? t("totalDuration", { duration: formatMinutes(journey.durationMin) }) : ""].filter(Boolean).join(" · ");
  const dayShift = journey.arriveDate && journey.date ? journey.legs.reduce((sum, leg) => sum + leg.dayShift, 0) : 0;
  return <article className="rounded-card border border-line bg-canvas" aria-label={`${title}: ${journey.from.city} – ${journey.to.city}`}>
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="t-small font-semibold text-brand">{title}</p>
        <h4 className="t-h3 mt-1 break-words">{journey.from.city} <span className="text-ink-soft" aria-hidden="true">→</span> {journey.to.city}</h4>
      </div>
      <p className="t-small inline-flex items-center gap-2 rounded-btn bg-brand-tint px-3 py-1 font-semibold text-brand-deep"><Clock3 size={16} strokeWidth={1.75} aria-hidden="true" />{summary}</p>
    </header>
    <ol className="px-2 py-4 sm:px-4">
      {journey.legs.map((leg, index) => {
        const connection = journey.connections[index];
        return [
          <Stop key={`${leg.id}-from`} time={leg.from.time} code={leg.from.code} city={leg.from.city} airport={leg.from.airport} date={leg.from.date} journeyDate={journey.date} locale={locale} first={index === 0} />,
          <LegRow key={`${leg.id}-leg`} leg={leg} />,
          <Stop key={`${leg.id}-to`} time={leg.to.time} code={leg.to.code} city={leg.to.city} airport={leg.to.airport} date={leg.to.date} journeyDate={journey.date} locale={locale} last={index === journey.legs.length - 1} />,
          connection ? <li key={`${leg.id}-connection`} className="grid grid-cols-[5.25rem_1.25rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[6rem_1.5rem_minmax(0,1fr)]">
            <span />
            <Rail dashed />
            <div className="my-2 min-w-0 rounded-card border border-dashed border-line px-4 py-3">
              <p className="t-small font-semibold text-ink">{t("connection", { city: connection.city })}</p>
              {connection.minutes !== null ? <p className="t-small font-normal text-ink-soft">{t("wait", { duration: formatMinutes(connection.minutes) })}</p> : null}
              {connection.overnight ? <p className="t-small font-normal text-ink-soft">{t("overnight")}</p> : null}
              {connection.airportChange ? <p className="t-small font-semibold text-error">{t("airportChange", { from: connection.code, to: connection.nextCode })}</p> : null}
            </div>
          </li> : null,
        ];
      })}
    </ol>
    {dayShift > 0 ? <p className="t-small border-t border-line px-4 py-3 font-normal text-ink-soft sm:px-6">{t("nextDayLabel", { days: dayShift })} · {formatTripDate(journey.arriveDate, locale, "weekday")}</p> : null}
  </article>;
}
