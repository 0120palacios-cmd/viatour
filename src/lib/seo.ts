import type { Metadata } from "next";
// Metadatos funcionales en borrador, pendientes de aprobación editorial.
export function pageMetadata(path: string, title: string, description: string, image?: string | null, article = false): Metadata {
 const images = [{ url: image || "/og", alt: title }];
 return { title: { absolute: title }, description, alternates: { canonical: path }, openGraph: { title, description, url: path, siteName: "viatour", locale: "es_HN", type: article ? "article" : "website", images }, twitter: { card: "summary_large_image", title, description, images } };
}
export const agencySchema = { "@context": "https://schema.org", "@type": "TravelAgency", "@id": "https://miviatour.com/#agency", name: "viatour", url: "https://miviatour.com", areaServed: "Honduras", contactPoint: { "@type": "ContactPoint", telephone: "+50488668704", contactType: "customer service", availableLanguage: "es" } };

// Draft fallback uses the actual record name; editorial metadata remains owner-managed.
export function detailDescription(subject: string, copy?: string | null) {
 const plain = copy?.replace(/\s+/g, " ").trim() || "";
 let text = subject + ". " + plain;
 if (text.length < 150) text += " Consulte la información disponible y solicite su cotización con viatour para planificar su viaje desde Honduras con asesoría personal.";
 if (text.length <= 160) return text.trim();
 const cut = text.lastIndexOf(" ", 159);
 return text.slice(0, cut > 140 ? cut : 159).replace(/[.,;:]$/, "") + ".";
}
