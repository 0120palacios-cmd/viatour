-- Reservation messages: one conversation per reservation between the traveller (Mi viaje) and viatour.
-- Additive and idempotent. Requires public.reservations and public.is_admin(). NOT applied to production:
-- run manually with `npx supabase db query --linked --file docs/sql/reservation_messages.sql` only after
-- the owner approves it and a fresh backup exists. The app works without it (the portal falls back to
-- the existing support requests and WhatsApp).
--
-- Access model (same as support_tickets and portal_otps):
-- - Customers never touch this table directly. /api/mi-reserva/mensajes uses the service role on the
--   server, scoped to the reservation of the verified OTP session cookie, never to an ID from the browser.
-- - Admins read and reply with their own session through RLS (public.is_admin()).
-- - anon has no grants.
--
-- Checks: docs/sql/reservation_messages_checks.sql (read-only, before and after).
-- Rollback (only while no conversation must be kept; verify first with the post-check count):
--   begin; drop table public.reservation_messages; commit;
-- The application keeps working without the table (it falls back to support requests and WhatsApp).

begin;

create table if not exists public.reservation_messages (
  id uuid primary key default gen_random_uuid(),
  -- restrict, not cascade: a customer conversation is a record of what was promised and must never vanish
  -- silently (the application never deletes reservations).
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  sender text not null check (sender in ('cliente', 'agencia')),
  topic text check (topic is null or topic in ('vuelo', 'hotel', 'documentos', 'cambios', 'pagos', 'otro')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  admin_id uuid,
  customer_read_at timestamptz,
  agency_read_at timestamptz,
  created_at timestamptz not null default now(),
  check ((sender = 'agencia') = (admin_id is not null))
);

create index if not exists reservation_messages_reservation_created_idx
  on public.reservation_messages (reservation_id, created_at);
create index if not exists reservation_messages_unread_agency_idx
  on public.reservation_messages (reservation_id) where sender = 'cliente' and agency_read_at is null;

alter table public.reservation_messages enable row level security;
drop policy if exists reservation_messages_admin_select on public.reservation_messages;
create policy reservation_messages_admin_select on public.reservation_messages for select to authenticated using (public.is_admin());
drop policy if exists reservation_messages_admin_insert on public.reservation_messages;
create policy reservation_messages_admin_insert on public.reservation_messages for insert to authenticated
  with check (public.is_admin() and sender = 'agencia' and admin_id = auth.uid());
drop policy if exists reservation_messages_admin_update on public.reservation_messages;
create policy reservation_messages_admin_update on public.reservation_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on table public.reservation_messages from anon, public;
grant select on table public.reservation_messages to authenticated;
-- Column-level insert: an admin session cannot backdate created_at or pre-set read flags.
grant insert (reservation_id, sender, topic, body, admin_id) on table public.reservation_messages to authenticated;
-- Admins may only mark customer messages as read; the text and author of a message never change.
grant update (agency_read_at) on table public.reservation_messages to authenticated;
do $$ begin if exists (select 1 from pg_roles where rolname = 'service_role') then grant select, insert, update on public.reservation_messages to service_role; end if; end $$;

commit;
