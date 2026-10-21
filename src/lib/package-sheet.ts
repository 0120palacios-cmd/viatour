// Optional rich content of a package (`packages.ficha`, jsonb): highlights, hotel choices, a structured
// itinerary, experiences, quote options, information sections, requestable extras, SEO overrides and photo
// credits. Written by the data scripts, never by visitors, but read defensively: anything malformed is
// dropped so the page still renders.

export type PhotoRef = { archivo: string; alt: string };
export type PackageSection = { titulo: string; parrafos: string[]; items: string[] };
// A way to take the package (e.g. city hotel only, or with an all-inclusive night). `cotizacion` is the
// exact text the quote request and the WhatsApp message carry.
export type PackageOption = { id: string; titulo: string; cotizacion: string; descripcion: string; cambios: string[]; costo_adicional: boolean; foto: PhotoRef | null };
export type PackageHotel = {
  id: string; nombre: string; categoria: string; zona: string; descripcion: string; habitacion: string; plan: string;
  amenidades: string[]; ideal: string | null; condiciones: string[]; mejoras: string[]; fotos: PhotoRef[]; recomendado: boolean;
};
// One accommodation stay (the city hotel, the beach resort). `campo` is the quote field it fills; `opcion`
// limits the stay to one quote option (the resort night of option B).
export type PackageStay = { id: string; campo: "hotel" | "resort"; titulo: string; noches: string; plan: string; descripcion: string | null; portada: PhotoRef | null; opcion: string | null; hoteles: PackageHotel[] };
export type PackageDay = { titulo: string; descripcion: string; comidas: string | null; alojamiento: string | null };
export type PackageExperience = {
  id: string; titulo: string; modalidad: "incluido" | "libre" | "opcional"; foto: PhotoRef | null; descripcion: string; destacados: string[];
  duracion: string | null; lugar: string | null; entradas: string | null; preparacion: string | null; notas: string[];
};
export type PhotoCredit = { archivo: string; alt: string; autor: string; licencia: string; licencia_url: string | null; fuente: string };
export type PackageSheet = {
  subtitulo: string | null;
  destacados: string[];
  opciones_titulo: string | null;
  opciones: PackageOption[];
  estancias: PackageStay[];
  dias: PackageDay[];
  experiencias: PackageExperience[];
  secciones: PackageSection[];
  adicionales: string[];
  aviso: string | null;
  seo: { titulo: string | null; descripcion: string | null };
  creditos: PhotoCredit[];
};

// Links such as #opcion-b (the "Cotizar esta opción" buttons) and #hotel-riu-plaza-panama ("Prefiero este
// hotel") preselect that choice in the quote form.
export const optionHash = (id: string) => `opcion-${id}`;
export const hotelHash = (id: string) => `hotel-${id}`;

const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, max: number) => typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
const list = (value: unknown, max: number, limit: number) => (Array.isArray(value) ? value : []).map(item => text(item, max)).filter((item): item is string => item !== null).slice(0, limit);
const url = (value: unknown) => { const v = text(value, 500); return v && /^https:\/\//.test(v) ? v : null; };
const slug = (value: unknown) => { const v = text(value, 60); return v && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? v : null; };
// Local files only: photos are stored under public/, never hotlinked.
const photo = (value: unknown): PhotoRef | null => {
  if (!object(value)) return null;
  const archivo = text(value.archivo, 300), alt = text(value.alt, 300);
  return archivo && alt && /^\/[a-z0-9/_.-]+\.(?:jpg|jpeg|webp|png)$/i.test(archivo) && !archivo.includes("..") ? { archivo, alt } : null;
};
const photos = (value: unknown, limit: number) => (Array.isArray(value) ? value : []).map(photo).filter((item): item is PhotoRef => item !== null).slice(0, limit);
const records = <T>(value: unknown, limit: number, read: (item: Record<string, unknown>) => T | null) => (Array.isArray(value) ? value : []).flatMap(item => { const result = object(item) ? read(item) : null; return result ? [result] : []; }).slice(0, limit);

function readHotel(item: Record<string, unknown>, ids: Set<string>): PackageHotel | null {
  const id = slug(item.id), nombre = text(item.nombre, 120), categoria = text(item.categoria, 80), zona = text(item.zona, 200), descripcion = text(item.descripcion, 1200), habitacion = text(item.habitacion, 300), plan = text(item.plan, 400);
  if (!id || !nombre || !categoria || !zona || !descripcion || !habitacion || !plan || ids.has(id)) return null;
  ids.add(id);
  return { id, nombre, categoria, zona, descripcion, habitacion, plan, amenidades: list(item.amenidades, 300, 10), ideal: text(item.ideal, 400), condiciones: list(item.condiciones, 400, 8), mejoras: list(item.mejoras, 300, 6), fotos: photos(item.fotos, 12), recomendado: item.recomendado === true };
}

export function readPackageSheet(value: unknown): PackageSheet | null {
  if (!object(value)) return null;
  const seo = object(value.seo) ? value.seo : {};
  const optionIds = new Set<string>();
  const opciones = records(value.opciones, 4, option => {
    const id = slug(option.id), titulo = text(option.titulo, 160), cotizacion = text(option.cotizacion, 160), descripcion = text(option.descripcion, 1000);
    if (!id || !titulo || !cotizacion || !descripcion || optionIds.has(id)) return null;
    optionIds.add(id);
    return { id, titulo, cotizacion, descripcion, cambios: list(option.cambios, 500, 12), costo_adicional: option.costo_adicional === true, foto: photo(option.foto) };
  });
  const validOptions = opciones.length > 1 ? opciones : [];
  // Hotel ids are unique across stays: each one is a link target in the quote form.
  const hotelIds = new Set<string>(), stayFields = new Set<string>();
  const estancias = records(value.estancias, 3, stay => {
    const id = slug(stay.id), campo: PackageStay["campo"] | null = stay.campo === "hotel" || stay.campo === "resort" ? stay.campo : null, titulo = text(stay.titulo, 160), noches = text(stay.noches, 80), plan = text(stay.plan, 160);
    const opcion = slug(stay.opcion), hoteles = records(stay.hoteles, 8, hotel => readHotel(hotel, hotelIds));
    if (!id || !campo || !titulo || !noches || !plan || !hoteles.length || stayFields.has(campo) || (opcion && !validOptions.some(option => option.id === opcion))) return null;
    stayFields.add(campo);
    return { id, campo, titulo, noches, plan, descripcion: text(stay.descripcion, 800), portada: photo(stay.portada), opcion, hoteles };
  });
  const dias = records(value.dias, 15, day => {
    const titulo = text(day.titulo, 120), descripcion = text(day.descripcion, 2000);
    return titulo && descripcion ? { titulo, descripcion, comidas: text(day.comidas, 160), alojamiento: text(day.alojamiento, 160) } : null;
  });
  const experienceIds = new Set<string>();
  const experiencias = records(value.experiencias, 12, item => {
    const id = slug(item.id), titulo = text(item.titulo, 120), descripcion = text(item.descripcion, 1500);
    const modalidad: PackageExperience["modalidad"] | null = item.modalidad === "incluido" || item.modalidad === "libre" || item.modalidad === "opcional" ? item.modalidad : null;
    if (!id || !titulo || !descripcion || !modalidad || experienceIds.has(id)) return null;
    experienceIds.add(id);
    return { id, titulo, modalidad, foto: photo(item.foto), descripcion, destacados: list(item.destacados, 300, 8), duracion: text(item.duracion, 120), lugar: text(item.lugar, 200), entradas: text(item.entradas, 300), preparacion: text(item.preparacion, 500), notas: list(item.notas, 500, 6) };
  });
  const secciones = records(value.secciones, 12, section => {
    const titulo = text(section.titulo, 120), parrafos = list(section.parrafos, 2000, 6), items = list(section.items, 500, 20);
    return titulo && (parrafos.length || items.length) ? { titulo, parrafos, items } : null;
  });
  const creditos = records(value.creditos, 80, credit => {
    const archivo = text(credit.archivo, 300), alt = text(credit.alt, 300), autor = text(credit.autor, 200), licencia = text(credit.licencia, 80), fuente = url(credit.fuente);
    return archivo && alt && autor && licencia && fuente ? { archivo, alt, autor, licencia, licencia_url: url(credit.licencia_url), fuente } : null;
  });
  return {
    subtitulo: text(value.subtitulo, 300),
    destacados: list(value.destacados, 300, 8),
    opciones_titulo: text(value.opciones_titulo, 160),
    opciones: validOptions,
    estancias,
    dias,
    experiencias,
    secciones,
    adicionales: list(value.adicionales, 120, 12),
    aviso: text(value.aviso, 1000),
    seo: { titulo: text(seo.titulo, 70), descripcion: text(seo.descripcion, 170) },
    creditos,
  };
}
