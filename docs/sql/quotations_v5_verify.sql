-- Solo lectura. Ejecutar en el SQL Editor de Supabase DESPUÉS de quotations_v5.sql.

-- 1. Columnas nuevas (5 filas).
select column_name, data_type, is_nullable, column_default from information_schema.columns
where table_schema = 'public' and table_name = 'quotations' and column_name in ('tipo', 'detalles', 'vence_en', 'version', 'version_aceptada');

-- 2. Las cotizaciones existentes quedaron como 'general', con detalles vacíos y versión 0; sin pérdida.
select tipo, count(*), count(*) filter (where detalles = '{}'::jsonb) as sin_detalles, max(version) as version_max
from public.quotations group by tipo;
select count(*) as items_totales from public.quotation_items;  -- igual al conteo del preflight

-- 3. Restricciones y disparador.
select conname from pg_constraint where conrelid = 'public.quotations'::regclass and conname in ('quotations_tipo_check', 'quotations_detalles_size', 'quotations_version_check');  -- 3 filas
select tgrelid::regclass as tabla, tgname from pg_trigger where tgrelid in ('public.quotation_versions'::regclass, 'public.quotations'::regclass, 'public.quotation_items'::regclass) and tgname in ('quotation_versions_no_update', 'quotations_lock_accepted', 'quotation_items_lock_accepted');  -- 3 filas
select proname from pg_proc where proname in ('replace_quotation_items', 'quotations_lock_accepted', 'quotation_items_lock_accepted', 'quotation_versions_immutable');  -- 4 filas
select indexname from pg_indexes where indexname in ('reservations_quotation_unique', 'quotations_vence_en_idx', 'quotations_ref_creacion_idx');  -- 3 filas

-- 4. RLS y políticas (2 en quotation_versions, 3 en storage para quotation-media).
select relname, relrowsecurity from pg_class where oid = 'public.quotation_versions'::regclass;
select tablename, policyname, cmd, roles from pg_policies where policyname in ('quotation_versions_admin_select', 'quotation_versions_admin_insert', 'quotation_media_admin_select', 'quotation_media_admin_insert', 'quotation_media_admin_delete_unused') order by tablename, policyname;  -- 5 filas
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'quotation_versions' and grantee = 'anon';  -- cero filas

-- 5. Bucket privado, solo JPEG, 5 MB.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'quotation-media';

-- 6. Comparación con la copia de seguridad (si ejecutó quotations_v5_backup.sql): todas deben dar 0.
select count(*) as cotizaciones_faltantes from backup_v5.quotations b where not exists (select 1 from public.quotations q where q.id = b.id);
select count(*) as cotizaciones_cambiadas from backup_v5.quotations b join public.quotations q using (id)
where (q.codigo, q.cliente_nombre, q.cliente_email, q.destino, q.moneda, q.total, q.estado, q.validez) is distinct from (b.codigo, b.cliente_nombre, b.cliente_email, b.destino, b.moneda, b.total, b.estado, b.validez);
select count(*) as items_faltantes from backup_v5.quotation_items b where not exists (select 1 from public.quotation_items i where i.id = b.id);
