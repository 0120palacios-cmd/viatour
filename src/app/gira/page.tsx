import type { Metadata } from "next";
import { headers } from "next/headers";
import { PromoWheel } from "@/components/promo/wheel";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await headers()).get("x-viatour-locale") === "en";
  return pageMetadata("/gira", en ? "Share your trip and win | viatour" : "Comparta su viaje y gane | viatour", en ? "Share your viatour trip video, receive an advisor-issued code after approval and spin for a travel prize." : "Comparta el video de su viaje con viatour, reciba un código de su asesor al aprobarlo y gire por un premio de viaje.", undefined, false, en ? "en" : "es");
}

export default async function PromoPage() {
  const en = (await headers()).get("x-viatour-locale") === "en";
  const steps = en ? ["Travel with viatour.", "Share a video of your trip on WhatsApp.", "Once approved, receive your code.", "Spin the wheel and win a prize for your trip."] : ["Viaje con viatour.", "Comparta el video de su viaje por WhatsApp.", "Al aprobarlo, reciba su código.", "Gire la ruleta y gane un premio para su viaje."];
  const title = en ? "Where will your next trip take you? Share your trip and win." : "¿A dónde lo llevará su próximo viaje? Comparta su viaje y gane.";
  const intro = en ? "Travel with viatour, share a video of your trip on WhatsApp and, once approved, receive a code to spin the wheel and win a prize for your trip." : "Viaje con viatour, comparta el video de su viaje por WhatsApp y, al aprobarlo, reciba un código para girar la ruleta y ganar un premio para su viaje.";
  const terms = en ? "Your trip must be a real trip booked with viatour; you authorize us to publish your video on our social channels; one spin per trip; prizes are subject to availability and advisor confirmation; no cash value." : "Debe ser un viaje real reservado con viatour; usted autoriza publicar su video en nuestras redes; un giro por viaje; premios sujetos a disponibilidad y a confirmación del asesor; sin valor en efectivo.";
  const message = en ? "I travelled with viatour and would like to submit my trip video for the Share your trip and win promotion." : "Viajé con viatour y deseo compartir el video de mi viaje para participar en la promoción Comparta su viaje y gane.";
  return <main className="container-site space-y-12 py-14 sm:py-24">
    <header className="max-w-3xl space-y-6"><h1 className="t-h1">{title}</h1><p className="t-body-lg text-ink-soft">{intro}</p><a className="inline-flex min-h-12 items-center rounded-btn bg-wa px-6 text-ink" href={`https://wa.me/50488668704?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">{en ? "Share your video on WhatsApp" : "Comparta su video por WhatsApp"}</a></header>
    <ol className="grid gap-4 sm:grid-cols-2">{steps.map((step, index) => <li key={step} className="rounded-card border border-line bg-surface p-6"><span className="t-small text-ink-soft">0{index + 1}</span><p className="t-h3 mt-3">{step}</p></li>)}</ol>
    <section aria-labelledby="wheel-heading" className="rounded-panel border border-line p-6 sm:p-8"><div className="mb-8 space-y-3"><h2 id="wheel-heading" className="t-h2">{en ? "Spin the wheel" : "Gire la ruleta"}</h2><p className="t-body text-ink-soft">{en ? "You need a code issued by your advisor after your video is approved." : "Necesita un código emitido por su asesor después de aprobar su video."}</p></div><PromoWheel /></section>
    <p className="t-small max-w-3xl text-ink-soft">{terms}</p>
  </main>;
}
