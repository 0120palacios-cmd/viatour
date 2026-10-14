-- Solo lectura. Ejecutar ANTES de quotations_v6.sql y revisar cada resultado.

-- 1. V5 aplicado: deben existir quotations.tipo, quotations.detalles y la tabla quotation_versions.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'quotations' and column_name in ('tipo', 'detalles', 'vence_en', 'version', 'version_aceptada');
select to_regclass('public.quotation_versions') as tabla_versiones;

-- 2. Restricción actual de tipos (debe listar general, vuelo, hotel, ferry y paquete).
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.quotations'::regclass and conname = 'quotations_tipo_check';

-- 3. Tipos en uso: todos deben estar en la lista anterior (si aparece otro, no ejecute la migración).
select tipo, count(*) from public.quotations group by tipo order by tipo;

-- 4. Las tablas nuevas no deberían existir todavía (tres nulos). Si existen, compare sus columnas con el archivo.
select to_regclass('public.hotel_catalog') as hoteles, to_regclass('public.airline_catalog') as aerolineas, to_regclass('public.airline_fare_presets') as tarifas;

-- 5. public.is_admin() existe sin argumentos.
select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';

-- 6. Política actual de borrado de fotos (se reemplaza por una que también revisa el catálogo).
select policyname, qual from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'quotation_media_admin_delete_unused';

-- 7. Políticas de storage.objects sin filtro por bucket (deberían ser cero filas).
select policyname, cmd, roles from pg_policies where schemaname = 'storage' and tablename = 'objects'
  and coalesce(qual, '') not like '%bucket_id%' and coalesce(with_check, '') not like '%bucket_id%';

-- 8. Conteos para comparar después.
select (select count(*) from public.quotations) as cotizaciones, (select count(*) from public.quotation_items) as items, (select count(*) from public.quotation_versions) as versiones;
