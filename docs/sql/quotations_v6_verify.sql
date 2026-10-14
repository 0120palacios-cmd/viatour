-- Solo lectura. Ejecutar DESPUÉS de quotations_v6.sql.

-- 1. Los conteos deben coincidir con el paso 8 del preflight.
select (select count(*) from public.quotations) as cotizaciones, (select count(*) from public.quotation_items) as items, (select count(*) from public.quotation_versions) as versiones;

-- 2. La restricción de tipos incluye 'combinado'.
select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.quotations'::regclass and conname = 'quotations_tipo_check';

-- 3. Tablas nuevas con RLS activo (tres filas, relrowsecurity = true).
select relname, relrowsecurity from pg_class where oid in ('public.hotel_catalog'::regclass, 'public.airline_catalog'::regclass, 'public.airline_fare_presets'::regclass);

-- 4. Una política por tabla, solo para authenticated y con public.is_admin().
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('hotel_catalog', 'airline_catalog', 'airline_fare_presets') order by tablename;

-- 5. anon no tiene privilegios sobre los catálogos (cero filas).
select table_name, privilege_type from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public' and table_name in ('hotel_catalog', 'airline_catalog', 'airline_fare_presets');

-- 6. Disparadores de auditoría (tres filas).
select tgname, tgrelid::regclass from pg_trigger where tgname in ('hotel_catalog_audit', 'airline_catalog_audit', 'airline_fare_presets_audit');

-- 7. La política de borrado de fotos revisa también hotel_catalog.
select policyname, qual like '%hotel_catalog%' as revisa_catalogo from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname = 'quotation_media_admin_delete_unused';

-- 8. Los disparadores de V5 siguen activos.
select tgname from pg_trigger where tgname in ('quotations_lock_accepted', 'quotation_items_lock_accepted', 'quotation_versions_no_update');
