-- Solo lectura. Ejecutar en el SQL Editor de Supabase ANTES de quotations_v5.sql y revisar cada resultado.

-- 1. Columnas actuales de quotations. Ninguna de tipo, detalles, vence_en o version debería existir; si
--    alguna existe con otro uso, no ejecute la migración y consulte antes.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'quotations'
order by ordinal_position;

-- 2. id de quotations debe ser uuid (la tabla de versiones la referencia).
select data_type from information_schema.columns
where table_schema = 'public' and table_name = 'quotations' and column_name = 'id';

-- 3. Restricciones e índices existentes con los mismos nombres (deberían ser cero filas).
select conname from pg_constraint
where conrelid = 'public.quotations'::regclass and conname in ('quotations_tipo_check', 'quotations_detalles_size', 'quotations_version_check');
select indexname from pg_indexes where schemaname = 'public' and indexname in ('quotations_vence_en_idx', 'quotations_ref_creacion_idx');

-- 4. public.is_admin() existe y no recibe argumentos.
select p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';

-- 5. RLS de quotations y quotation_items: debe estar activo y solo para administradores.
select relname, relrowsecurity from pg_class where oid in ('public.quotations'::regclass, 'public.quotation_items'::regclass);
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('quotations', 'quotation_items', 'customers', 'reservations')
order by tablename, policyname;

-- 6. Políticas de storage.objects que NO filtran por bucket: cualquiera de estas podría exponer las
--    fotos del bucket nuevo. Deberían ser cero filas.
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and coalesce(qual, '') not like '%bucket_id%' and coalesce(with_check, '') not like '%bucket_id%';

-- 7. Tamaño actual (para estimar duración; la migración no reescribe filas).
select count(*) as cotizaciones, (select count(*) from public.quotation_items) as items from public.quotations;

-- 8. ¿Existe ya la tabla de versiones o el bucket? (normalmente no)
select to_regclass('public.quotation_versions') as tabla_versiones;
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'quotation-media';

-- 9. Reservas duplicadas por cotización. Deben ser CERO filas: la migración agrega una regla de "una
--    reserva por cotización" y se detendría si ya hay duplicados.
select quotation_id, count(*) from public.reservations
where quotation_id is not null group by quotation_id having count(*) > 1;

-- 10. Columnas que usan los controles nuevos (deben aparecer las tres).
select table_name, column_name from information_schema.columns
where (table_schema = 'public' and table_name = 'reservations' and column_name = 'quotation_id')
   or (table_schema = 'storage' and table_name = 'objects' and column_name in ('created_at', 'name'));

-- 11. Cotizaciones aceptadas hoy (quedarán bloqueadas para edición; se cambian con una enmienda).
select count(*) as aceptadas from public.quotations where estado = 'aceptada';

-- 12. Disparadores existentes en quotations y quotation_items (para saber si algo más los modifica).
select event_object_table, trigger_name, action_timing, event_manipulation from information_schema.triggers
where event_object_schema = 'public' and event_object_table in ('quotations', 'quotation_items');
