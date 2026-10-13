-- Ejecutar manualmente en Supabase (SQL Editor). No lo ejecuta la aplicación.
-- V5 (2026-10-12): cotizaciones estructuradas (vuelos, hoteles, paquetes), validez con hora y zona,
-- versiones emitidas inmutables y fotos de hoteles en un bucket privado.
--
-- Antes: ejecute docs/sql/quotations_v5_preflight.sql (solo lectura) y revise sus resultados.
-- Después: ejecute docs/sql/quotations_v5_verify.sql (solo lectura).
--
-- Es aditivo y se puede volver a ejecutar: no borra ni modifica columnas existentes. Las cotizaciones
-- anteriores quedan como tipo 'general' con detalles '{}' (por los valores por defecto; no requiere
-- relleno) y siguen funcionando igual: su validez se interpreta como el final del día indicado en hora
-- de Honduras. Requiere public.is_admin(), que ya usa el panel. Todo corre en una transacción: si un
-- paso falla, no queda nada a medias.

begin;

-- 1. Columnas nuevas en quotations
alter table public.quotations add column if not exists tipo text not null default 'general';
alter table public.quotations add column if not exists detalles jsonb not null default '{}'::jsonb;
alter table public.quotations add column if not exists vence_en timestamptz;
alter table public.quotations add column if not exists version integer not null default 0;
-- Versión enviada que el cliente aceptó; la reserva se crea desde esa copia fija.
alter table public.quotations add column if not exists version_aceptada integer;

do $$ begin
  alter table public.quotations add constraint quotations_tipo_check check (tipo in ('general', 'vuelo', 'hotel', 'paquete'));
exception when duplicate_object then null; end $$;

-- Límite de tamaño de los detalles (el servidor ya los recorta; esto es una segunda barrera).
do $$ begin
  alter table public.quotations add constraint quotations_detalles_size check (pg_column_size(detalles) <= 262144);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.quotations add constraint quotations_version_check check (version >= 0);
exception when duplicate_object then null; end $$;

create index if not exists quotations_vence_en_idx on public.quotations (vence_en);
-- Evita crear dos veces la misma cotización si el navegador reintenta el primer guardado.
create index if not exists quotations_ref_creacion_idx on public.quotations ((detalles ->> 'refCreacion')) where detalles ? 'refCreacion';

-- 2. Versiones emitidas: copia exacta de lo que se envió al cliente (incluidas las condiciones), para
-- que cambios posteriores en la cotización o en las plantillas no alteren un documento ya emitido.
create table if not exists public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  emitida_en timestamptz not null default now(),
  emitida_por uuid default auth.uid(),
  unique (quotation_id, version)
);

alter table public.quotation_versions enable row level security;
revoke all on public.quotation_versions from anon;

drop policy if exists "quotation_versions_admin_select" on public.quotation_versions;
create policy "quotation_versions_admin_select" on public.quotation_versions
  for select to authenticated using (public.is_admin());

drop policy if exists "quotation_versions_admin_insert" on public.quotation_versions;
create policy "quotation_versions_admin_insert" on public.quotation_versions
  for insert to authenticated with check (public.is_admin() and emitida_por = auth.uid());
-- Sin políticas de update ni delete. Además, el disparador impide modificar una versión incluso con la
-- service role. Solo se eliminan junto con su cotización (on delete cascade); el panel no borra cotizaciones.

create or replace function public.quotation_versions_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Las versiones emitidas de una cotización no se pueden modificar.' using errcode = 'check_violation';
end;
$$;

drop trigger if exists quotation_versions_no_update on public.quotation_versions;
create trigger quotation_versions_no_update before update on public.quotation_versions
  for each row execute function public.quotation_versions_immutable();

-- 3. Cotización aceptada = contenido bloqueado. Solo pueden cambiar el estado, el asesor asignado, el
-- contador de versiones y la fecha de actualización. Para cambiar precios o condiciones se crea una
-- enmienda (cotización nueva) desde el panel. Aplica a cualquier rol, también a la service role.
create or replace function public.quotations_lock_accepted() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.estado = 'aceptada' and new.estado = 'aceptada'
     and (to_jsonb(new) - array['updated_at', 'version', 'version_aceptada', 'agente_id'])
         is distinct from (to_jsonb(old) - array['updated_at', 'version', 'version_aceptada', 'agente_id']) then
    raise exception 'La cotización fue aceptada y no se puede modificar. Cree una enmienda.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists quotations_lock_accepted on public.quotations;
create trigger quotations_lock_accepted before update on public.quotations
  for each row execute function public.quotations_lock_accepted();

create or replace function public.quotation_items_lock_accepted() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.quotations q where q.id = coalesce(new.quotation_id, old.quotation_id) and q.estado = 'aceptada') then
    raise exception 'La cotización fue aceptada y sus precios no se pueden modificar. Cree una enmienda.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists quotation_items_lock_accepted on public.quotation_items;
create trigger quotation_items_lock_accepted before insert or update or delete on public.quotation_items
  for each row execute function public.quotation_items_lock_accepted();

-- 4. Reemplazo atómico de los precios: borra e inserta en la misma transacción, con la cotización
-- bloqueada (FOR UPDATE), y recalcula el total con la misma regla que la aplicación (centavos exactos,
-- "Descuento" resta). Una conversión a reserva nunca ve precios a medio guardar. SECURITY INVOKER: se
-- aplica el RLS de la sesión del administrador.
create or replace function public.replace_quotation_items(p_quotation_id uuid, p_items jsonb)
returns numeric
language plpgsql security invoker set search_path = '' as $$
declare
  v_total numeric(12, 2);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Lista de precios inválida.' using errcode = 'invalid_parameter_value';
  end if;
  perform 1 from public.quotations where id = p_quotation_id for update;
  if not found then
    raise exception 'Cotización no encontrada.' using errcode = 'no_data_found';
  end if;
  delete from public.quotation_items where quotation_id = p_quotation_id;
  insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
  select p_quotation_id, item ->> 'descripcion', item ->> 'tipo', (item ->> 'cantidad')::integer, (item ->> 'precio_unitario')::numeric, (position - 1)::int
  from jsonb_array_elements(p_items) with ordinality as entries(item, position);
  select coalesce(sum(case when lower(btrim(tipo)) = 'descuento' then -1 else 1 end * round(cantidad * precio_unitario, 2)), 0)
    into v_total from public.quotation_items where quotation_id = p_quotation_id;
  update public.quotations set total = v_total where id = p_quotation_id;
  return v_total;
end;
$$;

revoke all on function public.replace_quotation_items(uuid, jsonb) from public, anon;
grant execute on function public.replace_quotation_items(uuid, jsonb) to authenticated;

-- 5. Una sola reserva por cotización: dos clics o dos pestañas no pueden convertir dos veces.
-- (El preflight comprueba que hoy no haya duplicados; si los hay, esta línea detiene la migración.)
create unique index if not exists reservations_quotation_unique on public.reservations (quotation_id) where quotation_id is not null;

-- 6. Bucket privado para fotos de hoteles (solo administradores con su propia sesión).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quotation-media', 'quotation-media', false, 5242880, array['image/jpeg']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quotation_media_admin_select" on storage.objects;
create policy "quotation_media_admin_select" on storage.objects
  for select to authenticated using (bucket_id = 'quotation-media' and public.is_admin());

drop policy if exists "quotation_media_admin_insert" on storage.objects;
create policy "quotation_media_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'quotation-media' and public.is_admin() and name ~ '^hotel/[0-9a-f]{32}\.jpg$');
-- Sin política de update: una foto subida no se reemplaza. Borrar solo se permite para fotos sin uso: con
-- más de 7 días (para no tocar subidas de un borrador aún sin guardar) y que no aparezcan en ninguna
-- cotización ni en ninguna versión enviada. La base de datos lo comprueba en cada borrado.
drop policy if exists "quotation_media_admin_delete_unused" on storage.objects;
create policy "quotation_media_admin_delete_unused" on storage.objects
  for delete to authenticated using (
    bucket_id = 'quotation-media' and public.is_admin()
    and created_at < now() - interval '7 days'
    and not exists (select 1 from public.quotations q where position(name in q.detalles::text) > 0)
    and not exists (select 1 from public.quotation_versions v where position(name in v.snapshot::text) > 0)
  );

commit;

-- Reversión (pierde los datos estructurados guardados después de aplicar este archivo; las versiones
-- enviadas se pierden). Ejecute en una transacción:
--   begin;
--   -- primero las políticas de storage: la de borrado depende de quotation_versions y de detalles
--   drop policy if exists "quotation_media_admin_select" on storage.objects;
--   drop policy if exists "quotation_media_admin_insert" on storage.objects;
--   drop policy if exists "quotation_media_admin_delete_unused" on storage.objects;
--   drop table if exists public.quotation_versions;
--   drop function if exists public.quotation_versions_immutable();
--   drop trigger if exists quotations_lock_accepted on public.quotations;
--   drop function if exists public.quotations_lock_accepted();
--   drop trigger if exists quotation_items_lock_accepted on public.quotation_items;
--   drop function if exists public.quotation_items_lock_accepted();
--   drop function if exists public.replace_quotation_items(uuid, jsonb);
--   drop index if exists public.reservations_quotation_unique;
--   drop index if exists public.quotations_ref_creacion_idx;
--   drop index if exists public.quotations_vence_en_idx;
--   alter table public.quotations drop constraint if exists quotations_tipo_check;
--   alter table public.quotations drop constraint if exists quotations_detalles_size;
--   alter table public.quotations drop constraint if exists quotations_version_check;
--   alter table public.quotations drop column if exists tipo, drop column if exists detalles,
--     drop column if exists vence_en, drop column if exists version, drop column if exists version_aceptada;
--   commit;
-- El bucket quotation-media y sus fotos se eliminan desde Storage en el panel de Supabase, solo si ya
-- no se necesitan (Supabase no permite borrar objetos de storage con SQL).
