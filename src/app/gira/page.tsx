import type { Metadata } from "next";
import { headers } from "next/headers";
import { MessageCircle, Share2 } from "lucide-react";
import { PromoWheel } from "@/components/promo/wheel";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export async function generateMetadata(): Promise<Metadata> {
  const en = (await headers()).get("x-viatour-locale") === "en";
  return pageMetadata("/gira", en ? "Share your trip and win | viatour" : "Comparta su viaje y gane | viatour", en ? "Share your viatour trip video, receive an advisor-issued code after approval and spin for a travel prize." : "Comparta el video de su viaje con viatour, reciba un código de su asesor al aprobarlo y gire por un premio de viaje.", undefined, false, en ? "en" : "es");
}

// Copy pendiente de aprobación final (docs/copy-pending.md): la mecánica pide una publicación
// pública que etiquete a la cuenta, para que cada video llegue a nuevos viajeros.
export default async function PromoPage() {
  const en = (await headers()).get("x-viatour-locale") === "en";
  const handle = "@miviatour";
  const steps = en
    ? ["Travel with viatour.", `Post a video of your trip on TikTok, Instagram or Facebook and tag ${handle}.`, "Send us the link to your post on WhatsApp.", "Once approved, receive your code and spin the wheel."]
    : ["Viaje con viatour.", `Publique el video de su viaje en TikTok, Instagram o Facebook y etiquete a ${handle}.`, "Envíenos el enlace de su publicación por WhatsApp.", "Al aprobarla, reciba su código y gire la ruleta."];
  const title = en ? "Where will your next trip take you? Share your trip and win." : "¿A dónde lo llevará su próximo viaje? Comparta su viaje y gane.";
  const intro = en ? `Travel with viatour, post your trip video tagging ${handle} and send us the link on WhatsApp. Once approved, you will receive a code to spin the wheel and win a prize for your trip.` : `Viaje con viatour, publique el video de su viaje etiquetando a ${handle} y envíenos el enlace por WhatsApp. Al aprobarlo, recibirá un código para girar la ruleta y ganar un premio para su viaje.`;
  const terms = en ? "Your trip must be a real trip booked with viatour; your post must be public; you authorize us to publish your video on our social channels; one spin per trip; prizes are subject to availability and advisor confirmation; no cash value." : "Debe ser un viaje real reservado con viatour; su publicación debe ser pública; usted autoriza publicar su video en nuestras redes; un giro por viaje; premios sujetos a disponibilidad y a confirmación del asesor; sin valor en efectivo.";
  const message = en ? "I travelled with viatour and would like to join the Share your trip and win promotion. This is the link to my post: " : "Viajé con viatour y deseo participar en la promoción Comparta su viaje y gane. Este es el enlace de mi publicación: ";
  const referral = en ? `I recommend viatour for planning your next trip: ${siteConfig.url}` : `Le recomiendo viatour para planificar su próximo viaje: ${siteConfig.url}`;
  return <main className="container-site space-y-12 py-12 sm:py-24">
    <header className="max-w-3xl space-y-6"><h1 className="t-h1">{title}</h1><p className="t-body-lg text-ink-soft">{intro}</p><a className="inline-flex min-h-12 items-center gap-2 rounded-btn bg-wa px-6 py-3 font-semibold text-ink hover:bg-wa-deep" href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={20} strokeWidth={1.75} aria-hidden="true" />{en ? "Send your post link on WhatsApp" : "Envíe el enlace por WhatsApp"}</a></header>
    <ol className="grid gap-4 sm:grid-cols-2">{steps.map((step, index) => <li key={step} className="rounded-card border border-line bg-surface p-6"><span className="t-small text-ink-soft">0{index + 1}</span><p className="t-h3 mt-3">{step}</p></li>)}</ol>
    <section aria-labelledby="wheel-heading" className="rounded-panel border border-line p-6 sm:p-8"><div className="mb-8 space-y-3"><h2 id="wheel-heading" className="t-h2">{en ? "Spin the wheel" : "Gire la ruleta"}</h2><p className="t-body text-ink-soft">{en ? "You need a code issued by your advisor after your post is approved." : "Necesita un código emitido por su asesor después de aprobar su publicación."}</p></div><PromoWheel /></section>
    {siteConfig.referralProgram && <section aria-labelledby="referral-heading" className="max-w-3xl space-y-4"><h2 id="referral-heading" className="t-h2">{en ? "Recommend viatour" : "Recomiende viatour"}</h2><p className="t-body text-ink-soft">{en ? "Do you know someone planning a trip? Share viatour with them. When the person you referred books a trip, your advisor will give you a code to spin the wheel." : "¿Conoce a alguien que esté planificando un viaje? Compártale viatour. Cuando la persona que usted recomendó reserve su viaje, su asesor le entregará un código para girar la ruleta."}</p><a className="inline-flex min-h-12 items-center gap-2 rounded-btn border border-line px-6 py-3 text-ink hover:bg-surface" href={`https://wa.me/?text=${encodeURIComponent(referral)}`} target="_blank" rel="noopener noreferrer"><Share2 size={20} strokeWidth={1.75} className="text-ink-soft" aria-hidden="true" />{en ? "Share on WhatsApp" : "Compartir por WhatsApp"}</a></section>}
    <p className="t-small max-w-3xl text-ink-soft">{terms}</p>
  </main>;
}
