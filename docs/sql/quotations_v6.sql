-- Ejecutar manualmente en Supabase (SQL Editor o `npx supabase db query --linked --file`). No lo ejecuta
-- la aplicación.
-- V6 (2026-10-14): paquete combinado, catálogo de hoteles, catálogo de aerolíneas y plantillas de tarifa.
--
-- Antes: respaldo (pg_dump) y docs/sql/quotations_v6_preflight.sql (solo lectura).
-- Después: docs/sql/quotations_v6_verify.sql (solo lectura).
-- Requiere que docs/sql/quotations_v5.sql ya esté aplicado.
--
-- Es aditivo y se puede volver a ejecutar. No modifica filas existentes:
--   * El paquete combinado vive en quotations.detalles (jsonb) como las demás cotizaciones: la versión
--     enviada (quotation_versions.snapshot) ya guarda una copia exacta de cada servicio, sus fotos y sus
--     condiciones. Por eso no hace falta una tabla de componentes.
--   * Los catálogos son datos internos del panel: solo administradores (public.is_admin()) pueden leerlos
--     o modificarlos; anon no tiene acceso. No contienen precios.
--   * Una cotización copia los datos del catálogo al prepararse: editar o desactivar un registro del
--     catálogo nunca cambia una cotización ya preparada o enviada.
-- Todo corre en una transacción: si un paso falla, no queda nada a medias.

begin;

-- 1. Tipo de cotización 'combinado'. Se reemplaza la restricción por una que acepta los mismos valores
--    más 'combinado' (las filas existentes ya cumplen la nueva).
alter table public.quotations drop constraint if exists quotations_tipo_check;
alter table public.quotations add constraint quotations_tipo_check check (tipo in ('general', 'vuelo', 'hotel', 'ferry', 'paquete', 'combinado'));

-- 2. Auditoría común de los catálogos: quién creó y quién modificó por última vez, y cuándo. El
--    disparador fija los valores; el navegador no puede falsificarlos.
create or replace function public.catalog_audit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.creado_por := auth.uid();
  else
    new.created_at := old.created_at;
    new.creado_por := old.creado_por;
  end if;
  new.updated_at := now();
  new.actualizado_por := auth.uid();
  return new;
end;
$$;

-- 3. Catálogo de hoteles (datos maestros reutilizables, sin precios).
create table if not exists public.hotel_catalog (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 160),
  cadena text check (char_length(cadena) <= 120),
  pais text check (char_length(pais) <= 80),
  ciudad text check (char_length(ciudad) <= 120),
  destino text check (char_length(destino) <= 160),
  direccion text check (char_length(direccion) <= 300),
  ubicacion text check (char_length(ubicacion) <= 500),
  telefono text check (char_length(telefono) <= 60),
  email text check (char_length(email) <= 254),
  sitio_web text check (char_length(sitio_web) <= 300 and sitio_web ~* '^https://'),
  descripcion text check (char_length(descripcion) <= 2000),
  -- Solo cuando la categoría está verificada; si no, queda vacía.
  estrellas smallint check (estrellas between 1 and 5),
  -- Fotos en el bucket privado quotation-media (mismas rutas hotel/<hex>.jpg que las cotizaciones).
  fotos jsonb not null default '[]'::jsonb check (jsonb_typeof(fotos) = 'array'),
  amenidades jsonb not null default '[]'::jsonb check (jsonb_typeof(amenidades) = 'array'),
  -- Categorías de habitación con id estable, para enlazar tarifas en el futuro.
  habitaciones jsonb not null default '[]'::jsonb check (jsonb_typeof(habitaciones) = 'array'),
  planes jsonb not null default '[]'::jsonb check (jsonb_typeof(planes) = 'array'),
  -- Valores sugeridos de Incluido / No incluido / Con cargo. Se confirman en cada cotización.
  inclusiones jsonb not null default '[]'::jsonb check (jsonb_typeof(inclusiones) = 'array'),
  check_in time,
  check_out time,
  politicas text check (char_length(politicas) <= 1500),
  cancelacion text check (char_length(cancelacion) <= 1000),
  impuestos text check (impuestos in ('incluidos', 'no_incluidos', 'parcial')),
  cargo_resort text check (char_length(cargo_resort) <= 300),
  referencia_proveedor text check (char_length(referencia_proveedor) <= 160),
  notas_internas text check (char_length(notas_internas) <= 3000),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid,
  actualizado_por uuid,
  constraint hotel_catalog_json_size check (pg_column_size(fotos) + pg_column_size(amenidades) + pg_column_size(habitaciones) + pg_column_size(planes) + pg_column_size(inclusiones) <= 131072)
);

-- El mismo hotel no se registra dos veces en la misma ciudad.
create unique index if not exists hotel_catalog_nombre_ciudad_unique on public.hotel_catalog (lower(btrim(nombre)), lower(coalesce(btrim(ciudad), '')));
create index if not exists hotel_catalog_activo_idx on public.hotel_catalog (activo, nombre);

drop trigger if exists hotel_catalog_audit on public.hotel_catalog;
create trigger hotel_catalog_audit before insert or update on public.hotel_catalog
  for each row execute function public.catalog_audit();

alter table public.hotel_catalog enable row level security;
revoke all on public.hotel_catalog from anon;
drop policy if exists "hotel_catalog_admin_all" on public.hotel_catalog;
create policy "hotel_catalog_admin_all" on public.hotel_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4. Catálogo de aerolíneas.
create table if not exists public.airline_catalog (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  iata text check (iata ~ '^[A-Z0-9]{2}$'),
  icao text check (icao ~ '^[A-Z]{3}$'),
  pais text check (char_length(pais) <= 80),
  -- Información de aerolíneas operadoras (regionales, código compartido).
  operadora text check (char_length(operadora) <= 600),
  notas_internas text check (char_length(notas_internas) <= 3000),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid,
  actualizado_por uuid
);

create unique index if not exists airline_catalog_iata_unique on public.airline_catalog (iata) where iata is not null and activo;
create unique index if not exists airline_catalog_nombre_unique on public.airline_catalog (lower(btrim(nombre)));

drop trigger if exists airline_catalog_audit on public.airline_catalog;
create trigger airline_catalog_audit before insert or update on public.airline_catalog
  for each row execute function public.catalog_audit();

alter table public.airline_catalog enable row level security;
revoke all on public.airline_catalog from anon;
drop policy if exists "airline_catalog_admin_all" on public.airline_catalog;
create policy "airline_catalog_admin_all" on public.airline_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5. Plantillas de tarifa y equipaje por aerolínea. Son plantillas editables: el equipaje y las
--    condiciones cambian según familia de tarifa, ruta, país, operador, fecha de emisión y tipo de
--    pasajero, así que la cotización siempre pide confirmarlas.
create table if not exists public.airline_fare_presets (
  id uuid primary key default gen_random_uuid(),
  airline_id uuid not null references public.airline_catalog (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  cabina text check (char_length(cabina) <= 60),
  tipo_tarifa text check (char_length(tipo_tarifa) <= 80),
  -- A qué rutas o mercados se verificó (por ejemplo "Honduras – Estados Unidos").
  aplica_a text check (char_length(aplica_a) <= 300),
  equipaje jsonb not null default '{}'::jsonb check (jsonb_typeof(equipaje) = 'object' and pg_column_size(equipaje) <= 8192),
  cambios text check (char_length(cambios) <= 400),
  cancelacion text check (char_length(cancelacion) <= 400),
  reembolso text check (reembolso in ('reembolsable', 'no_reembolsable', 'parcial')),
  asientos text check (char_length(asientos) <= 300),
  restricciones text check (char_length(restricciones) <= 600),
  otras_inclusiones text check (char_length(otras_inclusiones) <= 600),
  fuente text check (char_length(fuente) <= 300),
  verificado_en date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid,
  actualizado_por uuid
);

create index if not exists airline_fare_presets_airline_idx on public.airline_fare_presets (airline_id);
create unique index if not exists airline_fare_presets_nombre_unique on public.airline_fare_presets (airline_id, lower(btrim(nombre)));

drop trigger if exists airline_fare_presets_audit on public.airline_fare_presets;
create trigger airline_fare_presets_audit before insert or update on public.airline_fare_presets
  for each row execute function public.catalog_audit();

alter table public.airline_fare_presets enable row level security;
revoke all on public.airline_fare_presets from anon;
drop policy if exists "airline_fare_presets_admin_all" on public.airline_fare_presets;
create policy "airline_fare_presets_admin_all" on public.airline_fare_presets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 6. Fotos: el catálogo de hoteles usa el mismo bucket privado. Una foto que aparece en el catálogo
--    tampoco se puede borrar como "sin uso" (antes solo se revisaban cotizaciones y versiones).
drop policy if exists "quotation_media_admin_delete_unused" on storage.objects;
create policy "quotation_media_admin_delete_unused" on storage.objects
  for delete to authenticated using (
    bucket_id = 'quotation-media' and public.is_admin()
    and created_at < now() - interval '7 days'
    and not exists (select 1 from public.quotations q where position(name in q.detalles::text) > 0)
    and not exists (select 1 from public.quotation_versions v where position(name in v.snapshot::text) > 0)
    and not exists (select 1 from public.hotel_catalog h where position(name in h.fotos::text) > 0)
  );

commit;

-- Base para el motor de cotización automática (no se crea hoy; ver docs/quotations-v6.md):
--   suppliers, hotel_rate_plans (hotel_id + habitación por id estable, régimen, moneda, impuestos),
--   hotel_rates (daterange de temporada, ocupación, precio neto interno), service_catalog (traslados,
--   tours, navieras), quotation_templates. Todas con RLS solo para administradores; una futura vista
--   pública se haría con tablas o vistas separadas sin precios internos ni proveedores.

-- Reversión (pierde los catálogos; las cotizaciones conservan su copia de los datos). Antes, cambie a
-- otro tipo las cotizaciones 'combinado' o la restricción del paso 1 fallará. En una transacción:
--   begin;
--   drop policy if exists "quotation_media_admin_delete_unused" on storage.objects;
--   create policy "quotation_media_admin_delete_unused" on storage.objects for delete to authenticated using (
--     bucket_id = 'quotation-media' and public.is_admin() and created_at < now() - interval '7 days'
--     and not exists (select 1 from public.quotations q where position(name in q.detalles::text) > 0)
--     and not exists (select 1 from public.quotation_versions v where position(name in v.snapshot::text) > 0));
--   drop table if exists public.airline_fare_presets;
--   drop table if exists public.airline_catalog;
--   drop table if exists public.hotel_catalog;
--   drop function if exists public.catalog_audit();
--   alter table public.quotations drop constraint if exists quotations_tipo_check;
--   alter table public.quotations add constraint quotations_tipo_check check (tipo in ('general', 'vuelo', 'hotel', 'ferry', 'paquete'));
--   commit;
