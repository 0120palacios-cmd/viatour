import { getTranslations } from "next-intl/server";
import { formatClock, formatMinutes, formatTripDate } from "@/lib/trip-format";
import type { JourneyView, FlightLeg, Connection } from "@/lib/trip-view";

// A journey the way an airline app reads on a phone: one vertical line from the first departure to the
// final arrival, with each flight and each connection on it. The first and last stops carry the weight;
// connection airports are quieter. Times are the local clock times printed on the ticket.

const row = "grid grid-cols-[4.5rem_1.5rem_minmax(0,1fr)] sm:grid-cols-[5.5rem_2rem_minmax(0,1fr)]";

function capitalized(text: string) { return text ? text[0].toLocaleUpperCase("es") + text.slice(1) : text; }

function Rail({ kind, dot }: { kind: "solid" | "dashed" | "start" | "end"; dot?: "end" | "middle" }) {
  const line = kind === "dashed" ? "border-dashed border-ink-soft/40" : "border-brand/30";
  return <span className="relative flex justify-center" aria-hidden="true">
    <span className={`absolute w-0 border-l-2 ${line} ${kind === "start" ? "bottom-0 top-3" : kind === "end" ? "top-0 h-3" : "inset-y-0"}`} />
    {dot ? <span className={`relative mt-1.5 rounded-full ${dot === "end" ? "size-3 bg-brand" : "size-3 border-2 border-brand bg-canvas"}`} /> : null}
  </span>;
}

// `continued`: the departure after a connection at the same airport, already named on the arrival above.
function Stop({ time, place, date, journeyDate, locale, edge, rail, continued = false }: { time: string; place: FlightLeg["from"]; date: string; journeyDate: string; locale: string; edge: boolean; rail: "start" | "end" | "solid"; continued?: boolean }) {
  const shifted = date && journeyDate && date !== journeyDate;
  const [clock, meridiem] = (formatClock(time, locale) || "—").split(/ (.+)/);
  return <li className={row}>
    <p className="pr-1 text-right">
      <span className={`block font-bold tabular-nums leading-6 text-ink ${edge ? "text-lg" : ""}`}>{clock}</span>
      {meridiem ? <span className="t-small block font-normal text-ink-soft">{meridiem}</span> : null}
    </p>
    <Rail kind={rail} dot={edge ? "end" : "middle"} />
    <div className="min-w-0 pb-1">
      <p className="leading-6"><span className={`font-bold tracking-wide text-ink ${edge ? "text-lg" : ""}`}>{place.code}</span> <span className={edge ? "font-semibold text-ink" : "text-ink"}>{continued ? "" : place.city}</span></p>
      {place.airport && !continued ? <p className="t-small break-words font-normal text-ink-soft">{place.airport}</p> : null}
      {shifted ? <p className="t-small font-semibold text-brand-deep">{capitalized(formatTripDate(date, locale, "weekday"))}</p> : null}
    </div>
  </li>;
}

async function Leg({ leg }: { leg: FlightLeg }) {
  const t = await getTranslations("trip.flight");
  const details = [leg.durationMin !== null ? t("flightTime", { duration: formatMinutes(leg.durationMin) }) : "", leg.cabin, leg.bookingClass ? t("class", { value: leg.bookingClass }) : "", leg.aircraft].filter(Boolean);
  return <li className={row}>
    <span />
    <Rail kind="solid" />
    <div className="min-w-0 py-4">
      <p className="t-small font-semibold text-ink">{[leg.airline, leg.flight].filter(Boolean).join(" · ")}</p>
      {details.length ? <p className="t-small font-normal text-ink-soft">{details.join(" · ")}</p> : null}
      {leg.operatedBy ? <p className="t-small font-normal text-ink-soft">{t("operatedBy", { airline: leg.operatedBy })}</p> : null}
    </div>
  </li>;
}

async function Layover({ connection }: { connection: Connection }) {
  const t = await getTranslations("trip.flight");
  return <li className={row}>
    <span />
    <Rail kind="dashed" />
    <div className="min-w-0 py-3">
      <div className="t-small rounded-btn bg-surface px-3 py-2">
        <p className="font-semibold text-ink">{t("connection", { city: connection.city })}{connection.minutes !== null ? <span className="font-normal text-ink-soft"> · {t("wait", { duration: formatMinutes(connection.minutes) })}</span> : null}</p>
        {connection.overnight ? <p className="font-normal text-ink-soft">{t("overnight")}</p> : null}
        {connection.airportChange ? <p className="font-semibold text-error">{t("airportChange", { from: connection.code, to: connection.nextCode })}</p> : null}
      </div>
    </div>
  </li>;
}

export async function FlightJourneyCard({ journey, locale, headingLevel = 3 }: { journey: JourneyView; locale: string; headingLevel?: 3 | 4 }) {
  const t = await getTranslations("trip.flight");
  const title = journey.kind === "tramo" ? t("tramo", { number: journey.index + 1 }) : t(journey.kind);
  const Heading = `h${headingLevel}` as "h3" | "h4";
  return <article className="overflow-hidden rounded-card border border-line bg-canvas" aria-labelledby={`journey-${journey.id}`}>
    <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
      <div className="min-w-0">
        <p className="t-small font-semibold text-brand">{title}<span className="font-normal text-ink-soft"> · {capitalized(formatTripDate(journey.date, locale, "weekday"))}</span></p>
        <Heading id={`journey-${journey.id}`} className="mt-1 text-lg font-bold leading-7 text-ink sm:text-xl">{journey.from.city} <span className="font-normal text-ink-soft" aria-hidden="true">→</span><span className="sr-only">–</span> {journey.to.city}</Heading>
      </div>
      <p className="t-small shrink-0 text-right font-normal text-ink-soft">
        <span className="block font-semibold text-ink">{journey.stops ? t("stops", { count: journey.stops }) : t("direct")}</span>
        {journey.durationMin !== null ? <span className="block">{formatMinutes(journey.durationMin)}</span> : null}
      </p>
    </header>
    <ol className="px-2 pb-2 pt-4 sm:px-4">
      {journey.legs.map((leg, index) => {
        const connection = journey.connections[index];
        const last = index === journey.legs.length - 1;
        return [
          <Stop key={`${leg.id}-from`} time={leg.from.time} place={leg.from} date={leg.from.date} journeyDate={journey.date} locale={locale} edge={index === 0} rail={index === 0 ? "start" : "solid"} continued={index > 0 && !journey.connections[index - 1]?.airportChange} />,
          <Leg key={`${leg.id}-leg`} leg={leg} />,
          <Stop key={`${leg.id}-to`} time={leg.to.time} place={leg.to} date={leg.to.date} journeyDate={journey.date} locale={locale} edge={last} rail={last ? "end" : "solid"} />,
          connection ? <Layover key={`${leg.id}-connection`} connection={connection} /> : null,
        ];
      })}
    </ol>
  </article>;
}
