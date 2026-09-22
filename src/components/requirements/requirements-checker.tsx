"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { publishedRequirementDestinations } from "@/lib/requirements/destinations";
import type { RequirementsResult } from "@/lib/requirements/types";

const iataTravelCentreUrl = "https://www.iatatravelcentre.com/";
const otherDestination = "__otro__";
const selectClassName = "h-12 w-full min-w-0 rounded-btn border border-line bg-canvas px-3 py-2 t-body text-ink transition-colors duration-(--duration-fast) ease-out focus-visible:border-brand";
function linkIcon() { return <ArrowUpRight size={16} strokeWidth={1.75} aria-hidden="true" />; }

export function RequirementsChecker() {
  const t = useTranslations("requirements");
  const [destinationChoice, setDestinationChoice] = useState("");
  const [customDestination, setCustomDestination] = useState("");
  const [dates, setDates] = useState("");
  const [transits, setTransits] = useState("");
  const [result, setResult] = useState<RequirementsResult | null>(null);
  const [busy, setBusy] = useState(false);
  const destination = destinationChoice === otherDestination ? customDestination.trim() : destinationChoice;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!destination) return;
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/requisitos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nacionalidad: "HN", destino: destination, fechas: dates || undefined, transitos: transits || undefined }) });
      const payload = (await response.json()) as RequirementsResult;
      if (!response.ok) setResult({ status: "default", provider: "requirements" });
      else setResult(payload.status === "ok" || payload.status === "region" ? payload : { status: "default", provider: payload.provider });
    } catch { setResult({ status: "default", provider: "requirements" }); } finally { setBusy(false); }
  }
  const data = result?.status === "ok" ? result.data : undefined;

  return <div className="space-y-8">
    <form onSubmit={submit} className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8" aria-describedby="requirements-form-help">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2"><label htmlFor="requirements-nationality" className="t-small">{t("passportNationality")}</label><select id="requirements-nationality" className={selectClassName} value="HN" disabled aria-readonly="true"><option value="HN">{t("honduras")}</option></select></div>
        <div className="space-y-2"><label htmlFor="requirements-destination" className="t-small">{t("destination")}</label><select id="requirements-destination" className={selectClassName} value={destinationChoice} onChange={event => setDestinationChoice(event.target.value)} required><option value="">{t("selectDestination")}</option>{publishedRequirementDestinations.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}<option value={otherDestination}>{t("otherDestination")}</option></select><p className="t-small text-ink-soft">{t("otherDestinationHint")}</p></div>
        {destinationChoice === otherDestination && <div className="space-y-2 md:col-span-2"><label htmlFor="requirements-custom-destination" className="t-small">{t("writeDestination")}</label><Input id="requirements-custom-destination" value={customDestination} onChange={event => setCustomDestination(event.target.value)} placeholder={t("exampleMadrid")} required maxLength={120} /></div>}
        <div className="space-y-2"><label htmlFor="requirements-dates" className="t-small">{t("dates")} <span className="font-normal text-ink-soft">({t("optional")})</span></label><Input id="requirements-dates" value={dates} onChange={event => setDates(event.target.value)} placeholder={t("dateExample")} maxLength={120} /></div>
        <div className="space-y-2"><label htmlFor="requirements-transits" className="t-small">{t("transits")} <span className="font-normal text-ink-soft">({t("optional")})</span></label><Input id="requirements-transits" value={transits} onChange={event => setTransits(event.target.value)} placeholder={t("transitExample")} maxLength={300} /></div>
      </div>
      <p id="requirements-form-help" className="t-small mt-6 text-ink-soft">{t("initialGuidance")}</p>
      <div className="mt-6 flex flex-wrap items-center gap-4"><Button type="submit" disabled={busy || !destination}>{busy ? t("checking") : t("check")}</Button>{busy && <span className="t-small text-ink-soft" role="status">{t("reviewing")}</span>}</div>
    </form>
    <aside className="rounded-panel border border-brand bg-brand-tint p-6" aria-label={t("notice")}><p className="t-body font-semibold text-ink">{t("disclaimer")}</p></aside>
    {result && <section className="rounded-panel border border-line bg-canvas p-6 shadow-sm sm:p-8" aria-labelledby="requirements-result-title" aria-live="polite">
      <div className="flex items-start gap-3"><CheckCircle2 size={24} strokeWidth={1.75} className="mt-1 shrink-0 text-brand" aria-hidden="true" /><div className="min-w-0 space-y-2"><h2 id="requirements-result-title" className="t-h2">{t("resultFor", { destination })}</h2><p className="t-body text-ink-soft">{t("resultIntro")}</p></div></div>
      {result.status === "region" ? <p className="mt-8 border-y border-line py-6 t-body text-ink-soft">{t("regionMessage")}</p> : data ? <dl className="mt-8 grid gap-6 border-y border-line py-6 md:grid-cols-2"><div><dt className="t-small text-ink-soft">{t("visa")}</dt><dd className="t-body mt-2">{data.visaRequirement}</dd></div><div><dt className="t-small text-ink-soft">{t("stay")}</dt><dd className="t-body mt-2">{data.allowedStay}</dd></div><div className="md:col-span-2"><dt className="t-small text-ink-soft">{t("documents")}</dt><dd className="t-body mt-2"><ul className="list-disc space-y-2 pl-5">{data.passportRules.map(rule => <li key={rule}>{rule}</li>)}</ul></dd></div>{data.transitRequirements && <div className="md:col-span-2"><dt className="t-small text-ink-soft">{t("transit")}</dt><dd className="t-body mt-2">{data.transitRequirements}</dd></div>}</dl> : <p className="mt-8 border-y border-line py-6 t-body text-ink-soft">{t("defaultMessage")}</p>}
      {data?.notes?.length ? <ul className="t-small space-y-2 text-ink-soft">{data.notes.map(note => <li key={note}>{note}</li>)}</ul> : null}{data?.updatedAt && <p className="t-small mt-6 text-ink-soft">{t("lastUpdated", { date: data.updatedAt })}</p>}<p className="t-small mt-6 font-semibold text-ink">{t("disclaimer")}</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">{result?.sourceUrl && <a href={result.sourceUrl} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">{t("officialDestination")} {linkIcon()}</a>}<a href={iataTravelCentreUrl} target="_blank" rel="noopener noreferrer" className="t-small inline-flex min-h-12 items-center gap-2 text-brand underline underline-offset-4">IATA Travel Centre {linkIcon()}</a></div>
    </section>}
  </div>;
}
