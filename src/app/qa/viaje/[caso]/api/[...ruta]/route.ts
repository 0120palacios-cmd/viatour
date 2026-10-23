import { tripFixtures } from "@/lib/trip-fixtures";
import { validateMessage } from "@/lib/reservation-messages";
import { attachmentHeaders, checkAttachment } from "@/lib/chat-attachments";
import { validateFeedback, validateServiceRequest } from "@/lib/trip-requests";
import { cleanImage } from "@/lib/attachment-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Local QA stand-in for the customer APIs (same gate as the fixture pages: `next dev`, or `next start` with
// TRIP_FIXTURES=1; production answers 404). It validates exactly like the real routes, with the same shared
// rules, and stores nothing: no database, storage, session or email. Attachments it "serves" are generated
// placeholders, never customer files.
const gate = () => process.env.NODE_ENV !== "development" && process.env.TRIP_FIXTURES !== "1";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const placeholderPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 52>>stream\nBT /F1 14 Tf 40 100 Td (Documento de prueba QA) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");

export async function GET(_: Request, { params }: { params: Promise<{ caso: string; ruta: string[] }> }) {
  if (gate()) return new Response("No encontrado", { status: 404 });
  const { caso, ruta } = await params;
  const fixture = tripFixtures()[caso];
  if (!fixture) return new Response("No encontrado", { status: 404 });
  if (ruta[0] === "mensajes") return json({ ok: true, available: fixture.thread.available, attachments: Boolean(fixture.thread.attachments), messages: fixture.thread.messages.map(message => ({ ...message, unread: message.sender === "agencia" && !message.customer_read_at, attachments: message.attachments ?? [] })) });
  if (ruta[0] === "tickets") return json({ ok: true, tickets: fixture.requests ?? [] });
  if (ruta[0] === "adjuntos" && ruta[1]) {
    const file = fixture.thread.messages.flatMap(message => message.attachments ?? []).find(item => item.id === ruta[1]);
    if (!file) return new Response("Archivo no disponible.", { status: 404 });
    if (file.mime === "application/pdf") return new Response(new Uint8Array(placeholderPdf), { headers: attachmentHeaders({ ...file, size: placeholderPdf.length }) });
    const { default: sharp } = await import("sharp");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="675"><rect width="900" height="675" fill="#E9F0FE"/><rect x="300" y="170" width="300" height="380" rx="36" fill="#103FAE"/><rect x="390" y="110" width="120" height="80" rx="20" fill="none" stroke="#103FAE" stroke-width="22"/><text x="450" y="630" font-family="Arial" font-size="34" text-anchor="middle" fill="#12161C">Imagen de prueba (QA)</text></svg>`;
    const image = await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
    return new Response(new Uint8Array(image), { headers: attachmentHeaders({ ...file, mime: "image/jpeg", size: image.length }) });
  }
  return new Response("No encontrado", { status: 404 });
}

export async function POST(request: Request, { params }: { params: Promise<{ caso: string; ruta: string[] }> }) {
  if (gate()) return new Response("No encontrado", { status: 404 });
  const { caso, ruta } = await params;
  const fixture = tripFixtures()[caso];
  if (!fixture) return json({ ok: false, error: "No encontrado." }, 404);
  if (ruta[0] === "servicios") {
    const input = await request.json().catch(() => null);
    const valid = input ? validateServiceRequest({ service: input.service, note: input.note }) : null;
    return valid ? json({ ok: true, reference: fixture.input.reservation.codigo, service: valid.service }) : json({ ok: false, error: "Revise su solicitud (la nota puede tener hasta 600 caracteres)." }, 400);
  }
  if (ruta[0] === "opinion") {
    const input = await request.json().catch(() => null);
    const valid = input ? validateFeedback({ rating: input.rating, comment: input.comment }) : null;
    return valid ? json({ ok: true }) : json({ ok: false, error: "Elija una calificación del 1 al 5." }, 400);
  }
  if (ruta[0] === "tickets") return json({ ok: true });
  if (ruta[0] === "mensajes") {
    if (!fixture.thread.available) return json({ ok: false, available: false, error: "Los mensajes no están disponibles en este momento." }, 503);
    const type = request.headers.get("content-type") ?? "";
    let body: unknown = "", topic: unknown = null, file: File | null = null;
    if (type.startsWith("multipart/form-data")) {
      const form = await request.formData();
      body = form.get("body") ?? ""; topic = form.get("topic") || null;
      const candidate = form.get("archivo");
      file = candidate instanceof File && candidate.size ? candidate : null;
    } else {
      const input = await request.json().catch(() => null);
      body = input?.body; topic = input?.topic ?? null;
    }
    const message = validateMessage({ body, topic }, { withAttachment: Boolean(file) });
    if (!message) return json({ ok: false, error: "Revise su mensaje (hasta 2000 caracteres)." }, 400);
    let attachments: { id: string; name: string; mime: string; size: number }[] = [];
    if (file) {
      if (!fixture.thread.attachments) return json({ ok: false, attachments: false, error: "Por ahora no se pueden adjuntar archivos. Envíe el texto o compártalo por WhatsApp." }, 503);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = checkAttachment(bytes, file.type, file.name);
      if (!check.ok) return json({ ok: false, error: check.reason === "tooLarge" ? "El archivo debe pesar como máximo 4 MB." : check.reason === "activePdf" ? "Este PDF no se puede adjuntar. Envíe una foto o un PDF sin contenido interactivo." : "Solo se pueden adjuntar fotos (JPG, PNG o WebP) y documentos PDF." }, 400);
      const clean = await cleanImage(bytes, check.mime);
      if (!clean) return json({ ok: false, error: "No pudimos leer la imagen. Intente con otra foto." }, 400);
      // The QA mock keeps nothing, so the attachment cannot be reopened: it is listed without an ID.
      attachments = [{ id: "", name: check.name, mime: clean.mime, size: clean.bytes.length }];
    }
    return json({ ok: true, message: { id: `qa-${Date.now()}`, sender: "cliente", topic: message.topic, body: message.body, created_at: new Date().toISOString(), unread: false, attachments } });
  }
  return json({ ok: false, error: "No encontrado." }, 404);
}
