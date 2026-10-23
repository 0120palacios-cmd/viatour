-- Read-only production preflight for the Mi viaje release (reservation_messages.sql, then mi_viaje_premium.sql).
-- Metadata and counts only: no customer content is selected. The transaction is read-only, so nothing can be
-- written even by mistake. Run: npx supabase db query --linked --file docs/sql/mi_viaje_release_preflight.sql
begin read only;
select json_build_object(
  -- Dependencies both migrations need.
  'has_reservations', to_regclass('public.reservations') is not null,
  'has_is_admin', to_regprocedure('public.is_admin()') is not null,
  'has_hit_rate_limit', exists (select 1 from pg_proc where proname = 'hit_rate_limit' and pronamespace = 'public'::regnamespace),
  'has_support_tickets', to_regclass('public.support_tickets') is not null,
  'has_service_role', exists (select 1 from pg_roles where rolname = 'service_role'),
  'has_gen_random_uuid', exists (select 1 from pg_proc where proname = 'gen_random_uuid'),
  -- 1. reservation_messages.sql
  'messages_table', to_regclass('public.reservation_messages') is not null,
  'messages_columns', (select coalesce(json_agg(column_name order by ordinal_position), '[]') from information_schema.columns where table_schema = 'public' and table_name = 'reservation_messages'),
  'messages_constraints', (select coalesce(json_agg(conname order by conname), '[]') from pg_constraint where conrelid = to_regclass('public.reservation_messages')),
  'messages_indexes', (select coalesce(json_agg(indexname order by indexname), '[]') from pg_indexes where schemaname = 'public' and tablename = 'reservation_messages'),
  'messages_policies', (select coalesce(json_agg(policyname order by policyname), '[]') from pg_policies where schemaname = 'public' and tablename = 'reservation_messages'),
  -- 2. mi_viaje_premium.sql
  'attachments_table', to_regclass('public.reservation_message_attachments') is not null,
  'service_requests_table', to_regclass('public.trip_service_requests') is not null,
  'feedback_table', to_regclass('public.trip_feedback') is not null,
  'post_customer_message_fn', exists (select 1 from pg_proc where proname = 'post_customer_message' and pronamespace = 'public'::regnamespace),
  'premium_policies', (select coalesce(json_agg(tablename || '.' || policyname order by tablename, policyname), '[]') from pg_policies where schemaname = 'public' and tablename in ('reservation_message_attachments', 'trip_service_requests', 'trip_feedback')),
  -- Storage the attachments use (no new storage objects or policies are created by the migrations).
  'portal_docs_bucket', (select json_build_object('public', public, 'file_size_limit', file_size_limit, 'mime', allowed_mime_types) from storage.buckets where id = 'portal-docs'),
  'portal_docs_policies', (select coalesce(json_agg(policyname order by policyname), '[]') from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'portal_docs%'),
  'chat_files_already_in_storage', (select count(*) from storage.objects where bucket_id = 'portal-docs' and name like '%/mensajes/%'),
  -- Volumes that tell how the fallback has been used (counts only).
  'reservations', (select count(*) from public.reservations),
  'open_support_tickets', (select count(*) from public.support_tickets where estado in ('abierto', 'en_revision')),
  'service_request_tickets', (select count(*) from public.support_tickets where asunto like 'Solicitud de servicio:%'),
  'feedback_tickets', (select count(*) from public.support_tickets where asunto like 'Opinión del viaje (%')
) as preflight;
commit;
