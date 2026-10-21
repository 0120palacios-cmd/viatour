-- Read-only checks for docs/sql/reservation_messages.sql. Run each block separately with
-- npx supabase db query --linked --file <file>; neither block writes anything.

-- PRE-MIGRATION (expect: has_is_admin = true, has_reservations = true, table_exists = false, has_service_role = true)
begin read only;
select to_regprocedure('public.is_admin()') is not null as has_is_admin,
       to_regclass('public.reservations') is not null as has_reservations,
       to_regclass('public.reservation_messages') is not null as table_exists,
       exists (select 1 from pg_roles where rolname = 'service_role') as has_service_role;
commit;

-- POST-MIGRATION (expect: rls = true; policies = 3; anon_select = false; auth_insert_created_at = false;
-- auth_insert_body = true; auth_update_body = false; auth_update_agency_read = true; auth_delete = false;
-- fk_rule = 'r' (restrict); indexes = 3 including the primary key; garbled = false)
begin read only;
select c.relrowsecurity as rls,
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'reservation_messages') as policies,
  has_table_privilege('anon', 'public.reservation_messages', 'select') as anon_select,
  has_column_privilege('authenticated', 'public.reservation_messages', 'created_at', 'insert') as auth_insert_created_at,
  has_column_privilege('authenticated', 'public.reservation_messages', 'body', 'insert') as auth_insert_body,
  has_column_privilege('authenticated', 'public.reservation_messages', 'body', 'update') as auth_update_body,
  has_column_privilege('authenticated', 'public.reservation_messages', 'agency_read_at', 'update') as auth_update_agency_read,
  has_table_privilege('authenticated', 'public.reservation_messages', 'delete') as auth_delete,
  (select confdeltype from pg_constraint where conrelid = c.oid and contype = 'f') as fk_rule,
  (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'reservation_messages') as indexes,
  (select count(*) from public.reservation_messages) as messages
from pg_class c where c.oid = 'public.reservation_messages'::regclass;
commit;
