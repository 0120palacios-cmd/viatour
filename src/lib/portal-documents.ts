// Travel documents in the private `portal-docs` bucket, one folder per reservation:
//   {reservationId}/viatour/{8 hex}-{safe name}  shared by the agency from the admin panel
//   {reservationId}/cliente/{uuid}.{ext}          uploaded by the customer from Mi reserva
//   {reservationId}/{uuid}.{ext}                  customer uploads made before the folders existed
// Nothing here creates URLs: links are signed on demand, after the session check, by the caller.

export type DocumentSource = "agency" | "customer";
export type StoredDocument = { path: string; name: string; source: DocumentSource; createdAt: string | null };

export const portalDocsBucket = "portal-docs";
export const agencyFolder = "viatour";
export const customerFolder = "cliente";
export const portalDocumentTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const portalDocumentMaxBytes = 8 * 1024 * 1024;
// Customer uploads pass through a hosting function, whose request body is capped at 4.5 MB (Vercel);
// larger photos are reduced in the browser first. Admin uploads go straight to storage (8 MB bucket limit).
export const portalUploadMaxBytes = 4 * 1024 * 1024;

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const extension = "(?:pdf|jpg|png|webp)";
const customerFile = new RegExp(`^${uuid}\\.${extension}$`, "i");
const agencyFile = new RegExp(`^[0-9a-f]{8}-[A-Za-z0-9._-]{1,100}\\.${extension}$`);

type ListedFile = { name: string; id?: string | null; created_at?: string | null };
type StorageList = { list(path: string, options?: { limit?: number; sortBy?: { column: string; order: string } }): PromiseLike<{ data: ListedFile[] | null; error: unknown }> };

// Only the three layouts above, inside this reservation's folder; anything else is rejected,
// so a path received from a browser can never reach another reservation or a parent folder.
export function documentSource(reservationId: string, path: string): DocumentSource | null {
  if (!new RegExp(`^${uuid}$`, "i").test(reservationId) || typeof path !== "string" || path.length > 300) return null;
  const parts = path.split("/");
  if (parts[0] !== reservationId) return null;
  if (parts.length === 2 && customerFile.test(parts[1])) return "customer";
  if (parts.length === 3 && parts[1] === customerFolder && customerFile.test(parts[2])) return "customer";
  if (parts.length === 3 && parts[1] === agencyFolder && agencyFile.test(parts[2])) return "agency";
  return null;
}

// "Pasaporte Señor López (1).PDF" -> "Pasaporte-Senor-Lopez-1.pdf": readable for the customer, safe as a storage key.
export function safeDocumentName(original: string, ext: string) {
  const base = original.replace(/\.[A-Za-z0-9]{1,5}$/, "").normalize("NFD").replace(/\p{M}/gu, "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-{2,}/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, 80);
  return `${base || "documento"}.${ext}`;
}

export function agencyDocumentPath(reservationId: string, original: string, ext: string, prefix: string) {
  return `${reservationId}/${agencyFolder}/${prefix.slice(0, 8)}-${safeDocumentName(original, ext)}`;
}

export function customerDocumentPath(reservationId: string, fileId: string, ext: string) {
  return `${reservationId}/${customerFolder}/${fileId}.${ext}`;
}

// The name a person sees: the agency's file name without its random prefix; customer uploads have no useful name.
export function documentDisplayName(path: string) {
  const file = path.split("/").pop() ?? "";
  return /^[0-9a-f]{8}-/.test(file) && path.includes(`/${agencyFolder}/`) ? file.slice(9).replace(/-/g, " ") : file;
}

export async function listReservationDocuments(storage: StorageList, reservationId: string): Promise<StoredDocument[]> {
  const folders = [reservationId, `${reservationId}/${agencyFolder}`, `${reservationId}/${customerFolder}`];
  const listed = await Promise.all(folders.map(folder => storage.list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } })));
  const documents: StoredDocument[] = [];
  listed.forEach((result, index) => {
    if (result.error) return;
    for (const file of result.data ?? []) {
      // Folder placeholders have no id; the source check drops anything outside the three layouts.
      if (!file.name || file.id === null) continue;
      const path = `${folders[index]}/${file.name}`;
      const source = documentSource(reservationId, path);
      if (source) documents.push({ path, name: documentDisplayName(path), source, createdAt: file.created_at ?? null });
    }
  });
  return documents.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
