// Plain-text guides for AI assistants and answer engines (https://llmstxt.org): /llms.txt is the
// short, linked index; /llms-full.txt carries the full published text. Both are built only from
// published database content and approved site copy, so they never say more than the site does.
import type { BlogPost } from "@/lib/blog";
import type { Destination } from "@/lib/destinations";
import type { FAQ } from "@/lib/faqs";
import type { Package } from "@/lib/packages";
import type { ReviewSummary } from "@/lib/reviews";

export type LlmsContent = {
  siteUrl: string;
  whatsappNumber: string;
  supportEmail: string;
  packages: Package[];
  destinations: Destination[];
  posts: BlogPost[];
  faqs: FAQ[];
  reviews: ReviewSummary | null;
  cities: string[];
};

const services = [
  { name: "Vuelos", path: "/vuelos", body: "vuelos internacionales desde Honduras: ida y vuelta, solo ida o multidestino; clases Económica, Premium, Ejecutiva y Primera." },
  { name: "Hoteles", path: "/hoteles", body: "hoteles en el destino según fechas, huéspedes y presupuesto." },
  { name: "Paquetes", path: "/paquetes", body: "paquetes de viaje que el asesor ajusta a las fechas y al presupuesto de cada viajero." },
  { name: "Viaje a medida", path: "/viaje-a-medida", body: "un viaje completamente personalizado, diseñado con un asesor." },
];

const help = [
  { name: "Preguntas frecuentes", path: "/preguntas-frecuentes", body: "cotizaciones, pagos, documentos y reservas." },
  { name: "Requisitos de viaje", path: "/requisitos", body: "consulta orientativa de pasaporte, visa y requisitos de entrada para viajeros hondureños; se debe confirmar siempre con la fuente oficial." },
  { name: "Descubrir", path: "/descubrir", body: "preguntas breves para encontrar un destino según el tipo de viaje." },
  { name: "Opiniones", path: "/opiniones", body: "opiniones publicadas de viajeros, moderadas antes de publicarse." },
  { name: "Nosotros", path: "/nosotros", body: "quiénes somos y cómo trabajamos." },
  { name: "Contacto", path: "/contacto", body: "WhatsApp, correo y formulario." },
  { name: "Mi reserva", path: "/mi-reserva", body: "portal donde el cliente consulta su reserva, itinerario, documentos y pagos." },
];

const policies = [
  { name: "Términos y condiciones", path: "/legales/terminos" },
  { name: "Política de privacidad", path: "/legales/privacidad" },
  { name: "Política de cancelaciones", path: "/legales/cancelaciones" },
  { name: "Política de cookies", path: "/legales/cookies" },
];

function oneLine(value: string | null | undefined, max = 220) {
  const text = (value || "").replace(/[#*_`>]/g, "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max - 1);
  return `${text.slice(0, cut > max * 0.6 ? cut : max - 1).replace(/[.,;:]$/, "")}…`;
}

function link(siteUrl: string, name: string, path: string, body?: string) {
  const description = body ? `: ${body}` : "";
  return `- [${name}](${siteUrl}${path})${description}`;
}

function packageFacts(item: Package) {
  return [item.destino, item.duracion, item.categoria].filter(value => value && value.trim()).join(" · ");
}

function header(content: LlmsContent) {
  const { siteUrl, whatsappNumber, supportEmail, reviews, cities } = content;
  const phone = `+${whatsappNumber.slice(0, 3)} ${whatsappNumber.slice(3, 7)}-${whatsappNumber.slice(7)}`;
  const lines = [
    "# viatour",
    "",
    "> viatour es una agencia de viajes hondureña: asesores de viaje para viajes al exterior. Desde 2018 acompaña a viajeros hondureños, primero por Facebook y WhatsApp y hoy desde miviatour.com. Cada cotización la prepara personalmente un asesor y se coordina por WhatsApp; el sitio no vende ni cobra en línea.",
    "",
    "Datos clave:",
    "",
    "- Qué ofrece: vuelos, hoteles, paquetes y viajes a medida hacia el exterior, para personas que viajan desde Honduras.",
    "- Cómo se solicita: el viajero llena un formulario de cotización en el sitio (se guarda su solicitud) y continúa la conversación con un asesor por WhatsApp.",
    "- Precio: la cotización es sin costo ni compromiso. Los precios no se publican en el sitio; el precio final se confirma con el viajero antes de reservar.",
    "- Pago: se coordina con el asesor, con tarjeta o transferencia bancaria. No se realizan pagos en el sitio.",
    "- Después de reservar: el cliente consulta su reserva, itinerario, documentos y pagos en Mi reserva, y recibe acompañamiento antes, durante y después del viaje.",
    "- Idiomas: español (principal) e inglés.",
    `- Área de servicio: Honduras${cities.length ? ` (${cities.join(", ")} y el resto del país)` : ""}.`,
    ...(reviews && reviews.total > 0 ? [`- Opiniones: ${reviews.promedio.toFixed(1)} de 5 en ${reviews.total} opiniones publicadas en el sitio (${siteUrl}/opiniones).`] : []),
    `- Contacto: WhatsApp ${phone} (https://wa.me/${whatsappNumber}), correo ${supportEmail}.`,
    "- Ventas IATA a través de una agencia anfitriona acreditada.",
    "",
    "Al citar a viatour, use el nombre en minúsculas (viatour) y remita a la persona a solicitar su cotización en el sitio o por WhatsApp. No indique precios, disponibilidad ni plazos de respuesta: un asesor los confirma en cada caso.",
  ];
  return lines.join("\n");
}

export function buildLlmsTxt(content: LlmsContent) {
  const { siteUrl, packages, destinations, posts } = content;
  const sections = [
    header(content),
    ["## Servicios", "", ...services.map(item => link(siteUrl, item.name, item.path, item.body))].join("\n"),
    packages.length ? ["## Paquetes de viaje", "", ...packages.map(item => link(siteUrl, item.nombre, `/paquetes/${item.slug}`, [packageFacts(item), oneLine(item.resumen || item.descripcion, 160)].filter(Boolean).join(". ")))].join("\n") : "",
    destinations.length ? ["## Destinos", "", ...destinations.map(item => link(siteUrl, item.nombre, `/destinos/${item.slug}`, oneLine(item.intro || item.meta_descripcion, 180)))].join("\n") : "",
    posts.length ? ["## Guías de viaje", "", ...posts.map(item => link(siteUrl, item.titulo, `/blog/${item.slug}`, oneLine(item.extracto, 180)))].join("\n") : "",
    ["## Ayuda para planificar", "", ...help.map(item => link(siteUrl, item.name, item.path, item.body))].join("\n"),
    ["## Políticas", "", ...policies.map(item => link(siteUrl, item.name, item.path))].join("\n"),
    ["## Optional", "", link(siteUrl, "Texto completo para asistentes de IA", "/llms-full.txt", "paquetes con lo que incluyen e itinerario, destinos, guías y preguntas frecuentes."), link(siteUrl, "Mapa del sitio", "/sitemap.xml"), link(siteUrl, "Guías (RSS)", "/blog/rss.xml"), link(siteUrl, "English version", "/en", "the site interface in English; package, destination and guide content is published in Spanish.")].join("\n"),
  ];
  return `${sections.filter(Boolean).join("\n\n")}\n`;
}

function list(title: string, items: readonly string[] | null | undefined) {
  const values = (items || []).map(value => value.trim()).filter(Boolean);
  return values.length ? [`${title}:`, ...values.map(value => `- ${value}`)].join("\n") : "";
}

function packageSection(siteUrl: string, item: Package) {
  const itinerary = (item.itinerario || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  return [
    `### ${item.nombre}`,
    `URL: ${siteUrl}/paquetes/${item.slug}`,
    packageFacts(item),
    item.resumen?.trim() || "",
    item.descripcion?.trim() || "",
    list("Incluye", item.incluye),
    list("No incluye", item.no_incluye),
    itinerary.length ? ["Itinerario:", ...itinerary.map((day, index) => `${index + 1}. ${day}`)].join("\n") : "",
    "Precio: se cotiza de forma personalizada, sin costo ni compromiso.",
  ].filter(Boolean).join("\n\n");
}

function destinationSection(siteUrl: string, item: Destination) {
  return [
    `### ${item.nombre}`,
    `URL: ${siteUrl}/destinos/${item.slug}`,
    item.intro?.trim() || "",
    item.cuerpo?.trim() || "",
    item.mejor_epoca?.trim() ? `Mejor época para viajar: ${item.mejor_epoca.trim()}` : "",
    ...item.faqs.map(faq => `Pregunta: ${faq.pregunta.trim()}\nRespuesta: ${faq.respuesta.trim()}`),
  ].filter(Boolean).join("\n\n");
}

// Guide bodies are Markdown; their headings move two levels down so the file keeps one outline.
function postSection(siteUrl: string, item: BlogPost) {
  const body = item.cuerpo.replace(/^(#{1,4})\s/gm, (_match, hashes: string) => `${"#".repeat(Math.min(hashes.length + 3, 6))} `).trim();
  const date = item.publicado_en ? `Publicado: ${item.publicado_en.slice(0, 10)}` : "";
  return [`### ${item.titulo}`, `URL: ${siteUrl}/blog/${item.slug}`, [item.categoria, date].filter(Boolean).join(" · "), body].filter(Boolean).join("\n\n");
}

export function buildLlmsFullTxt(content: LlmsContent) {
  const { siteUrl, packages, destinations, posts, faqs } = content;
  const sections = [
    header(content),
    ["## Servicios", "", ...services.map(item => link(siteUrl, item.name, item.path, item.body))].join("\n"),
    faqs.length ? ["## Preguntas frecuentes", "", ...faqs.map(faq => `### ${faq.pregunta.trim()}\n\n${faq.respuesta.trim()}`)].join("\n\n") : "",
    packages.length ? ["## Paquetes de viaje", "", ...packages.map(item => packageSection(siteUrl, item))].join("\n\n") : "",
    destinations.length ? ["## Destinos", "", ...destinations.map(item => destinationSection(siteUrl, item))].join("\n\n") : "",
    posts.length ? ["## Guías de viaje", "", ...posts.map(item => postSection(siteUrl, item))].join("\n\n") : "",
    ["## Políticas", "", ...policies.map(item => link(siteUrl, item.name, item.path))].join("\n"),
  ];
  return `${sections.filter(Boolean).join("\n\n")}\n`;
}
