import { getTranslations } from "next-intl/server";

// Shown while the trip loads (the page reads the reservation, travel record, payments and documents).
// It mirrors the trip header and status card so the layout does not jump when the content arrives.
export default async function Loading() {
  const t = await getTranslations("trip.states");
  return <main className="container-site pb-24 pt-6 sm:pt-10" aria-busy="true">
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <p className="sr-only" role="status">{t("loading")}</p>
      <div className="h-11 w-40 animate-pulse rounded-btn bg-surface motion-reduce:animate-none" aria-hidden="true" />
      <div className="h-[26rem] animate-pulse rounded-panel bg-brand-deep/90 motion-reduce:animate-none" aria-hidden="true" />
      <div className="h-48 animate-pulse rounded-panel bg-surface motion-reduce:animate-none" aria-hidden="true" />
    </div>
  </main>;
}
