"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/layout/whatsapp-link";

// A failed load (network, database) says what happened, offers a retry and a person to write to.
export default function MiReservaError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("trip.states");
  useEffect(() => { console.error(error); }, [error]);
  return <main className="container-site pb-24 pt-6 sm:pt-10">
    <section className="mx-auto max-w-xl rounded-panel border border-line bg-canvas p-6 sm:p-8" aria-labelledby="trip-error-title">
      <h1 id="trip-error-title" className="t-h2">{t("errorTitle")}</h1>
      <p className="t-body mt-3 text-ink-soft">{t("errorBody")}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" onClick={() => retry()}><RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />{t("retry")}</Button>
        <WhatsAppLink placement="mi-reserva-error" />
      </div>
    </section>
  </main>;
}
