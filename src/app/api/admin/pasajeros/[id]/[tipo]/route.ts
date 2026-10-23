import { requireAdmin } from "@/lib/admin";
import { validUuid } from "@/lib/quotation-validation";
import { passengerDocsBucket } from "@/lib/passenger-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Opens a passenger's photo or passport image through a signed link valid for 60 seconds. Every opening of a
// passport image is written to the activity history (who and when, never the image).
export async function GET(_: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { client } = await requireAdmin();
  const { id, tipo } = await params;
  if (!validUuid(id) || !["foto", "pasaporte"].includes(tipo)) return new Response("Imagen inválida.", { status: 400 });
  const profile = await client.from("passenger_profiles").select("foto_path,pasaporte_path").eq("id", id).maybeSingle();
  const path = tipo === "foto" ? profile.data?.foto_path : profile.data?.pasaporte_path;
  if (profile.error || !path) return new Response("No hay imagen.", { status: 404 });
  const signed = await client.storage.from(passengerDocsBucket).createSignedUrl(path, 60);
  if (signed.error || !signed.data?.signedUrl) return new Response("No se pudo abrir la imagen.", { status: 502 });
  if (tipo === "pasaporte") await client.rpc("log_admin_action", { p_action: "passenger.passport_viewed", p_entity: "passenger_profile", p_entity_id: id });
  return new Response(null, { status: 302, headers: { Location: signed.data.signedUrl, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
