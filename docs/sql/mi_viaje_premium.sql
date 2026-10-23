-- Mi viaje premium: chat attachments, additional-service requests and private trip feedback.
-- Additive and idempotent. NOT applied to production. Order and process (docs/mi-viaje-premium.md):
--   1. Owner approval and a fresh backup (see the production DB release process).
--   2. docs/sql/reservation_messages.sql (this file requires its table).
--   3. docs/sql/mi_viaje_premium_checks.sql, PRE block (read-only).
--   4. npx supabase db query --linked --file docs/sql/mi_viaje_premium.sql
--   5. docs/sql/mi_viaje_premium_checks.sql, POST block (read-only).
-- Rehearsed offline with scripts/test-mi-viaje-premium-sql.mjs (PGlite, no network or customer data).
--
-- Access model (same as reservation_messages, support_tickets and portal_otps):
-- - Customers never touch these tables. /api/mi-reserva/* uses the service role on the server, scoped to the
--   reservation of the verified OTP session cookie, never to an ID sent by the browser.
-- - Admins read and update with their own session through RLS (public.is_admin()).
-- - anon has no grants.
-- - Attachment files live in the existing private bucket `portal-docs` under {reservation}/mensajes/; no
--   storage policy changes are needed (the bucket is private, admin-only by policy, 8 MB, PDF/JPEG/PNG/WebP).
--
-- Rollback (only while nothing must be kept; check the POST counts first):
--   begin;
--   drop function if exists public.post_customer_message(uuid, text, text, text, text, text, integer);
--   drop table if exists public.reservation_message_attachments;
--   drop table if exists public.trip_service_requests;
--   drop table if exists public.trip_feedback;
--   alter table public.reservation_messages drop constraint if exists reservation_messages_body_text_check;
--   alter table public.reservation_messages add constraint reservation_messages_body_check check (char_length(btrim(body)) between 1 and 2000);  -- fails if an attachment-only message exists
--   commit;
-- Without these tables the application keeps working: no attachment button, service requests and feedback
-- go to the existing support requests (support_tickets), which staff already see in /admin/tickets.

begin;

do $$ begin
  if to_regclass('public.reservation_messages') is null then
    raise exception 'Apply docs/sql/reservation_messages.sql first.';
  end if;
end $$;

-- 0. Grants on reservation_messages as designed. Supabase's default privileges gave `authenticated` every
-- table privilege when that table was created in production, so the read-only check (2026-10-23) found
-- DELETE, UPDATE (body) and INSERT (created_at) still granted. RLS already denies all of it to non-admins;
-- this restores the intended immutability for admin sessions too (they insert replies and mark as read only).
revoke all on table public.reservation_messages from authenticated;
grant select on table public.reservation_messages to authenticated;
grant insert (reservation_id, sender, topic, body, admin_id) on table public.reservation_messages to authenticated;
grant update (agency_read_at) on table public.reservation_messages to authenticated;

-- 1. A customer message may be only an attachment (empty text). Agency replies still need text.
do $$ declare item record; begin
  for item in select conname from pg_constraint where conrelid = 'public.reservation_messages'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%btrim(body)%' and conname <> 'reservation_messages_body_text_check' loop
    execute format('alter table public.reservation_messages drop constraint %I', item.conname);
  end loop;
end $$;
alter table public.reservation_messages drop constraint if exists reservation_messages_body_text_check;
alter table public.reservation_messages add constraint reservation_messages_body_text_check
  check (char_length(body) <= 2000 and (sender = 'cliente' or char_length(btrim(body)) >= 1));
-- Lets an attachment reference its message and reservation together (no attachment can point to a message
-- of another reservation).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reservation_messages_id_reservation_key') then
    alter table public.reservation_messages add constraint reservation_messages_id_reservation_key unique (id, reservation_id);
  end if;
end $$;

-- 2. Attachments: one row per file, written only together with its message (post_customer_message).
create table if not exists public.reservation_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null,
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  path text not null unique,
  name text not null check (char_length(name) between 1 and 120),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size integer not null check (size between 1 and 4194304),
  uploaded_by text not null default 'cliente' check (uploaded_by in ('cliente', 'agencia')),
  created_at timestamptz not null default now(),
  foreign key (message_id, reservation_id) references public.reservation_messages (id, reservation_id) on delete restrict,
  -- The file must sit inside this reservation's own folder, in the chat subfolder, with a server-made name.
  check (path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/mensajes/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$'),
  check (split_part(path, '/', 1) = reservation_id::text)
);
create index if not exists reservation_message_attachments_reservation_idx on public.reservation_message_attachments (reservation_id, created_at);
create index if not exists reservation_message_attachments_message_idx on public.reservation_message_attachments (message_id);

alter table public.reservation_message_attachments enable row level security;
drop policy if exists reservation_message_attachments_admin_select on public.reservation_message_attachments;
create policy reservation_message_attachments_admin_select on public.reservation_message_attachments for select to authenticated using (public.is_admin());
revoke all on table public.reservation_message_attachments from anon, public, authenticated;
grant select on table public.reservation_message_attachments to authenticated;

-- 3. The customer's message and its attachment in one transaction. Only the service role may call it; the
-- application passes the reservation of the verified session and a path it generated itself.
create or replace function public.post_customer_message(p_reservation_id uuid, p_topic text, p_body text, p_path text, p_name text, p_mime text, p_size integer)
returns table (message_id uuid, message_created_at timestamptz, attachment_id uuid)
language plpgsql security invoker set search_path = public as $$
declare v_message uuid; v_at timestamptz; v_attachment uuid;
begin
  if p_path is null and char_length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Mensaje vacío.' using errcode = '22023';
  end if;
  insert into public.reservation_messages (reservation_id, sender, topic, body)
    values (p_reservation_id, 'cliente', p_topic, coalesce(p_body, ''))
    returning id, created_at into v_message, v_at;
  if p_path is not null then
    insert into public.reservation_message_attachments (message_id, reservation_id, path, name, mime, size, uploaded_by)
      values (v_message, p_reservation_id, p_path, p_name, p_mime, p_size, 'cliente')
      returning id into v_attachment;
  end if;
  return query select v_message, v_at, v_attachment;
end $$;
revoke all on function public.post_customer_message(uuid, text, text, text, text, text, integer) from public, anon, authenticated;

-- 4. Additional-service requests from Mi viaje ("Cotizar auto", "Agregar traslado", ...): the agency's
-- operational record; the WhatsApp conversation, if any, comes after it.
create table if not exists public.trip_service_requests (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  service text not null check (service in ('hotel', 'traslado', 'auto', 'tour', 'seguro', 'equipaje', 'vuelo', 'a_medida')),
  note text not null default '' check (char_length(note) <= 600),
  destination text not null default '' check (char_length(destination) <= 160),
  trip_start date,
  trip_end date,
  travelers smallint check (travelers is null or travelers between 0 and 99),
  status text not null default 'nueva' check (status in ('nueva', 'en_cotizacion', 'cotizada', 'confirmada', 'cerrada')),
  staff_note text check (staff_note is null or char_length(staff_note) <= 600),
  handled_by uuid,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists trip_service_requests_status_idx on public.trip_service_requests (status, created_at desc);
create index if not exists trip_service_requests_reservation_idx on public.trip_service_requests (reservation_id, created_at desc);

alter table public.trip_service_requests enable row level security;
drop policy if exists trip_service_requests_admin_select on public.trip_service_requests;
create policy trip_service_requests_admin_select on public.trip_service_requests for select to authenticated using (public.is_admin());
drop policy if exists trip_service_requests_admin_update on public.trip_service_requests;
create policy trip_service_requests_admin_update on public.trip_service_requests for update to authenticated using (public.is_admin()) with check (public.is_admin() and handled_by = auth.uid());
revoke all on table public.trip_service_requests from anon, public, authenticated;
grant select on table public.trip_service_requests to authenticated;
-- Staff change the status and their own note; what the customer asked for never changes.
grant update (status, staff_note, handled_by, updated_at) on table public.trip_service_requests to authenticated;

-- 5. Private feedback about viatour's service, one per reservation (the customer may revise it). It is
-- never published: public reviews stay in the existing reviews flow, offered to everyone regardless of rating.
create table if not exists public.trip_feedback (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
alter table public.trip_feedback enable row level security;
drop policy if exists trip_feedback_admin_select on public.trip_feedback;
create policy trip_feedback_admin_select on public.trip_feedback for select to authenticated using (public.is_admin());
revoke all on table public.trip_feedback from anon, public, authenticated;
grant select on table public.trip_feedback to authenticated;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert on public.reservation_message_attachments to service_role;
    grant execute on function public.post_customer_message(uuid, text, text, text, text, text, integer) to service_role;
    grant select, insert on public.trip_service_requests to service_role;
    grant select, insert, update on public.trip_feedback to service_role;
  end if;
end $$;

commit;
