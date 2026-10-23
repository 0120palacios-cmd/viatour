-- Structure only. No table rows, no document contents, no secrets.
begin read only;
select jsonb_build_object(
 'generated_at', now(),
 'server_version', current_setting('server_version'),
 'tables', (select jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity, 'forced', c.relforcerowsecurity,
    'columns', (select jsonb_agg(jsonb_build_object('name', a.attname, 'type', format_type(a.atttypid, a.atttypmod), 'not_null', a.attnotnull,
                 'default', pg_get_expr(d.adbin, d.adrelid), 'identity', a.attidentity, 'generated', a.attgenerated) order by a.attnum)
                from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
                where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
    'constraints', (select jsonb_agg(jsonb_build_object('name', k.conname, 'type', k.contype, 'def', pg_get_constraintdef(k.oid)) order by k.contype, k.conname) from pg_constraint k where k.conrelid = c.oid),
    'indexes', (select jsonb_agg(pg_get_indexdef(i.indexrelid) order by i.indexrelid::regclass::text) from pg_index i where i.indrelid = c.oid and not exists (select 1 from pg_constraint k where k.conindid = i.indexrelid)),
    'triggers', (select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal),
    'policies', (select jsonb_agg(jsonb_build_object('name', p.policyname, 'cmd', p.cmd, 'roles', p.roles, 'permissive', p.permissive, 'using', p.qual, 'check', p.with_check) order by p.policyname) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname),
    'grants', (select jsonb_agg(jsonb_build_object('grantee', g.grantee, 'privilege', g.privilege_type) order by g.grantee, g.privilege_type) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon','authenticated','service_role'))
  ) order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','p')),
 'views', (select jsonb_agg(jsonb_build_object('name', c.relname, 'def', pg_get_viewdef(c.oid, true), 'options', c.reloptions,
    'grants', (select jsonb_agg(jsonb_build_object('grantee', g.grantee, 'privilege', g.privilege_type) order by g.grantee, g.privilege_type) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon','authenticated','service_role'))) order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('v','m')),
 'sequences', (select jsonb_agg(c.relname order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'S'),
 'types', (select jsonb_agg(jsonb_build_object('name', t.typname, 'labels', (select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e'),
 'functions', (select jsonb_agg(jsonb_build_object('name', p.proname, 'args', pg_get_function_identity_arguments(p.oid), 'security_definer', p.prosecdef, 'acl', p.proacl::text[], 'def', pg_get_functiondef(p.oid)) order by p.proname, pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind in ('f','p')),
 'storage_buckets', (select jsonb_agg(jsonb_build_object('id', id, 'public', public, 'file_size_limit', file_size_limit, 'allowed_mime_types', allowed_mime_types) order by id) from storage.buckets),
 'storage_policies', (select jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check) order by policyname) from pg_policies where schemaname = 'storage'),
 'migration_table', to_regclass('supabase_migrations.schema_migrations')::text
) as baseline;
commit;
