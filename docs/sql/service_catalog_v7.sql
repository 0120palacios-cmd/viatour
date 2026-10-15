-- Ejecutar manualmente en Supabase (SQL Editor o `npx supabase db query --linked --file`). No lo ejecuta
-- la aplicación.
-- V7 (2026-10-15): catálogo de servicios reutilizables (navieras, traslados, tours, actividades, seguros,
-- asistencia y otros) para el editor de cotizaciones.
--
-- Requiere docs/sql/quotations_v6.sql (usa public.catalog_audit() y public.is_admin()).
-- Antes: respaldo (pg_dump). Después: la consulta de verificación al final (solo lectura).
--
-- Es aditivo y se puede volver a ejecutar. No modifica filas existentes.
--   * Solo datos maestros: nombre, operador, descripción, condiciones e inclusiones sugeridas. Sin precios,
--     sin disponibilidad, sin tarifas: elegir un servicio del catálogo no confirma nada con el proveedor.
--   * Una cotización copia los datos al prepararse: editar o desactivar un registro nunca cambia una
--     cotización ya preparada o enviada.
--   * Solo administradores (public.is_admin()) pueden leer o modificar; anon no tiene acceso.

begin;

create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ferry', 'traslado', 'tour', 'actividad', 'seguro', 'asistencia', 'otro')),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 160),
  operador text check (char_length(operador) <= 120),
  destino text check (char_length(destino) <= 160),
  descripcion text check (char_length(descripcion) <= 400),
  lugar text check (char_length(lugar) <= 200),
  duracion text check (char_length(duracion) <= 80),
  modalidad text check (modalidad in ('compartido', 'privado')),
  -- Valores sugeridos de Incluido / No incluido / Con cargo. Se confirman en cada cotización.
  inclusiones jsonb not null default '[]'::jsonb check (jsonb_typeof(inclusiones) = 'array' and pg_column_size(inclusiones) <= 16384),
  cancelacion text check (char_length(cancelacion) <= 800),
  -- Condiciones de naviera (solo tipo ferry).
  cambios text check (char_length(cambios) <= 400),
  equipaje_incluido text check (char_length(equipaje_incluido) <= 300),
  equipaje_adicional text check (char_length(equipaje_adicional) <= 300),
  embarque text check (char_length(embarque) <= 400),
  documentos text check (char_length(documentos) <= 400),
  notas_internas text check (char_length(notas_internas) <= 3000),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  creado_por uuid,
  actualizado_por uuid
);

-- El mismo servicio no se registra dos veces con el mismo tipo, nombre y operador.
create unique index if not exists service_catalog_unique on public.service_catalog (tipo, lower(btrim(nombre)), lower(coalesce(btrim(operador), '')));
create index if not exists service_catalog_tipo_idx on public.service_catalog (tipo, activo, nombre);

drop trigger if exists service_catalog_audit on public.service_catalog;
create trigger service_catalog_audit before insert or update on public.service_catalog
  for each row execute function public.catalog_audit();

alter table public.service_catalog enable row level security;
revoke all on public.service_catalog from anon;
drop policy if exists "service_catalog_admin_all" on public.service_catalog;
create policy "service_catalog_admin_all" on public.service_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- Verificación (solo lectura): debe devolver rls = true, una política y anon sin privilegios.
--   select c.relrowsecurity as rls,
--          (select count(*) from pg_policies where tablename = 'service_catalog') as politicas,
--          has_table_privilege('anon', 'public.service_catalog', 'select') as anon_lee
--   from pg_class c where c.oid = 'public.service_catalog'::regclass;

-- Reversión (pierde el catálogo de servicios; las cotizaciones conservan su copia de los datos):
--   drop table if exists public.service_catalog;
