-- Read-only checks for docs/sql/mi_viaje_premium.sql. Run each block separately with
-- npx supabase db query --linked --file <file>; neither block writes anything.

-- PRE-MIGRATION (expect: has_messages = true, has_is_admin = true, has_service_role = true,
-- has_bucket = true, attachments_exist = false, requests_exist = false, feedback_exist = false)
begin read only;
select to_regclass('public.reservation_messages') is not null as has_messages,
       to_regprocedure('public.is_admin()') is not null as has_is_admin,
       exists (select 1 from pg_roles where rolname = 'service_role') as has_service_role,
       exists (select 1 from storage.buckets where id = 'portal-docs' and public = false) as has_bucket,
       to_regclass('public.reservation_message_attachments') is not null as attachments_exist,
       to_regclass('public.trip_service_requests') is not null as requests_exist,
       to_regclass('public.trip_feedback') is not null as feedback_exist;
commit;

-- POST-MIGRATION (expect: every *_rls = true; anon_* = false; auth_insert_* = false; auth_update_service = false;
-- auth_update_status = true; auth_exec_post = false; service_exec_post = true; body_check present;
-- attachments/requests/feedback = 0 on a fresh apply; rm_auth_delete, rm_auth_update_body and
-- rm_auth_insert_created_at = false: the reservation_messages grants are repaired)
begin read only;
select
  (select relrowsecurity from pg_class where oid = 'public.reservation_message_attachments'::regclass) as attachments_rls,
  (select relrowsecurity from pg_class where oid = 'public.trip_service_requests'::regclass) as requests_rls,
  (select relrowsecurity from pg_class where oid = 'public.trip_feedback'::regclass) as feedback_rls,
  has_table_privilege('anon', 'public.reservation_message_attachments', 'select') as anon_attachments,
  has_table_privilege('anon', 'public.trip_service_requests', 'select') as anon_requests,
  has_table_privilege('anon', 'public.trip_feedback', 'select') as anon_feedback,
  has_table_privilege('authenticated', 'public.reservation_message_attachments', 'insert') as auth_insert_attachments,
  has_table_privilege('authenticated', 'public.trip_service_requests', 'insert') as auth_insert_requests,
  has_column_privilege('authenticated', 'public.trip_service_requests', 'service', 'update') as auth_update_service,
  has_column_privilege('authenticated', 'public.trip_service_requests', 'status', 'update') as auth_update_status,
  has_function_privilege('authenticated', 'public.post_customer_message(uuid, text, text, text, text, text, integer)', 'execute') as auth_exec_post,
  has_function_privilege('service_role', 'public.post_customer_message(uuid, text, text, text, text, text, integer)', 'execute') as service_exec_post,
  (select pg_get_constraintdef(oid) from pg_constraint where conname = 'reservation_messages_body_text_check') as body_check,
  has_table_privilege('authenticated', 'public.reservation_messages', 'delete') as rm_auth_delete,
  has_column_privilege('authenticated', 'public.reservation_messages', 'body', 'update') as rm_auth_update_body,
  has_column_privilege('authenticated', 'public.reservation_messages', 'created_at', 'insert') as rm_auth_insert_created_at,
  (select count(*) from public.reservation_message_attachments) as attachments,
  (select count(*) from public.trip_service_requests) as requests,
  (select count(*) from public.trip_feedback) as feedback;
commit;
