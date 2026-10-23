-- Admin overhaul, phase 0: append-only activity log. NOT APPLIED. Run only after the owner's backup and approval:
--   npx supabase db query --linked --file docs/sql/admin_audit_log.sql
-- Rehearsal (PGlite on the production schema snapshot): node scripts/test-admin-audit-log-sql.mjs
--
-- What it records: who changed the state of a quotation, reservation, invoice, payment, receipt or travel
-- file, from what to what, and when. Triggers write the rows, so every path is covered (admin actions,
-- RPCs, the daily job). Only whitelisted, non-personal fields are stored: statuses, codes, amounts and
-- currencies. Never names, e-mails, passport data, notes or document contents.
-- Additive: one table, one function and triggers that only insert. Reversal at the end of the file.
begin;

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,                      -- auth.uid(); null for the service role (daily job, public endpoints)
  action text not null check (action ~ '^[a-z_]+\.[a-z_]+$' and length(action) <= 80),
  entity text not null check (entity in ('quotation','reservation','invoice','payment','receipt','travel','admin')),
  entity_id uuid not null,
  reference text check (length(reference) <= 80),   -- human code: COT-…, VT-…, FAC-…, REC-…
  details jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 4096)
);
create index if not exists admin_audit_log_entity_idx on public.admin_audit_log (entity, entity_id, at desc);
create index if not exists admin_audit_log_at_idx on public.admin_audit_log (at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select on public.admin_audit_log for select to authenticated using (public.is_admin());
revoke all on sequence public.admin_audit_log_id_seq from anon, authenticated;

-- Append-only, also for the table owner's sessions: corrections are new rows, never edits.
create or replace function public.admin_audit_log_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'El registro de actividad no se puede modificar.' using errcode = '23514';
end; $$;
drop trigger if exists admin_audit_log_immutable on public.admin_audit_log;
create trigger admin_audit_log_immutable before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_immutable();

-- Explicit entries from server actions (for example "document viewed"). Admins only; the actor is always
-- the caller, never a parameter.
create or replace function public.log_admin_action(p_action text, p_entity text, p_entity_id uuid, p_reference text default null, p_details jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare entry bigint;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
    values (auth.uid(), p_action, p_entity, p_entity_id, p_reference, coalesce(p_details, '{}'::jsonb))
    returning id into entry;
  return entry;
end; $$;
revoke all on function public.log_admin_action(text, text, uuid, text, jsonb) from public, anon;
grant execute on function public.log_admin_action(text, text, uuid, text, jsonb) to authenticated;

-- One trigger function per table keeps each whitelist readable.
create or replace function public.audit_quotation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'quotation.created', 'quotation', new.id, new.codigo, jsonb_build_object('estado', new.estado, 'moneda', new.moneda));
  elsif new.estado is distinct from old.estado or new.sent_version_id is distinct from old.sent_version_id or new.accepted_version_id is distinct from old.accepted_version_id or new.agente_id is distinct from old.agente_id then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case when new.estado is distinct from old.estado then 'quotation.status_changed' when new.agente_id is distinct from old.agente_id then 'quotation.reassigned' else 'quotation.version_linked' end,
        'quotation', new.id, new.codigo,
        jsonb_strip_nulls(jsonb_build_object('from', old.estado, 'to', new.estado, 'version', new.version,
          'sent_version_id', new.sent_version_id, 'accepted_version_id', new.accepted_version_id,
          'agente_from', case when new.agente_id is distinct from old.agente_id then old.agente_id end,
          'agente_to', case when new.agente_id is distinct from old.agente_id then new.agente_id end)));
  end if;
  return null;
end; $$;

create or replace function public.audit_reservation_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare changes jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'reservation.created', 'reservation', new.id, new.codigo,
        jsonb_strip_nulls(jsonb_build_object('estado', new.estado, 'prerreserva', new.prerreserva, 'total', new.total, 'moneda', new.moneda, 'quotation_id', new.quotation_id)));
    return null;
  end if;
  if new.estado is distinct from old.estado then changes := changes || jsonb_build_object('estado', jsonb_build_array(old.estado, new.estado)); end if;
  if new.supplier_status is distinct from old.supplier_status then changes := changes || jsonb_build_object('supplier_status', jsonb_build_array(old.supplier_status, new.supplier_status)); end if;
  if new.supplier_reference is distinct from old.supplier_reference then changes := changes || jsonb_build_object('supplier_reference_changed', true); end if;
  if new.prerreserva is distinct from old.prerreserva then changes := changes || jsonb_build_object('prerreserva', jsonb_build_array(old.prerreserva, new.prerreserva)); end if;
  if new.total is distinct from old.total then changes := changes || jsonb_build_object('total', jsonb_build_array(old.total, new.total)); end if;
  if new.fecha_inicio is distinct from old.fecha_inicio or new.fecha_fin is distinct from old.fecha_fin then changes := changes || jsonb_build_object('fechas', jsonb_build_array(jsonb_build_array(old.fecha_inicio, old.fecha_fin), jsonb_build_array(new.fecha_inicio, new.fecha_fin))); end if;
  if new.cliente_apellido is distinct from old.cliente_apellido then changes := changes || jsonb_build_object('portal_access_changed', true); end if;
  if changes <> '{}'::jsonb then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case when new.estado = 'cancelada' and old.estado <> 'cancelada' then 'reservation.cancelled'
                              when new.estado is distinct from old.estado then 'reservation.status_changed'
                              when new.prerreserva is distinct from old.prerreserva then 'reservation.promoted'
                              when new.supplier_status is distinct from old.supplier_status then 'reservation.supplier_changed'
                              else 'reservation.updated' end,
        'reservation', new.id, new.codigo, changes);
  end if;
  return null;
end; $$;

create or replace function public.audit_invoice_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), 'invoice.created', 'invoice', new.id, new.numero, jsonb_build_object('estado', new.estado, 'total', new.total, 'moneda', new.moneda, 'reservation_id', new.reservation_id));
  elsif new.estado is distinct from old.estado then
    insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
      values (auth.uid(), case new.estado when 'anulada' then 'invoice.annulled' when 'pagada' then 'invoice.paid' when 'emitida' then 'invoice.issued' else 'invoice.status_changed' end,
        'invoice', new.id, new.numero, jsonb_build_object('from', old.estado, 'to', new.estado, 'reservation_id', new.reservation_id));
  end if;
  return null;
end; $$;

create or replace function public.audit_payment_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.recorded', 'payment', new.id, jsonb_build_object('reservation_id', new.reservation_id, 'monto', new.monto, 'moneda', new.moneda, 'metodo', new.metodo, 'fecha_pago', new.fecha_pago));
  elsif tg_op = 'UPDATE' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.edited', 'payment', new.id, jsonb_build_object('reservation_id', new.reservation_id, 'monto', jsonb_build_array(old.monto, new.monto), 'moneda', jsonb_build_array(old.moneda, new.moneda), 'fecha_pago', jsonb_build_array(old.fecha_pago, new.fecha_pago)));
  else
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.deleted', 'payment', old.id, jsonb_build_object('reservation_id', old.reservation_id, 'monto', old.monto, 'moneda', old.moneda, 'fecha_pago', old.fecha_pago));
  end if;
  return null;
end; $$;

create or replace function public.audit_receipt_created() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_log (actor, action, entity, entity_id, reference, details)
    values (auth.uid(), 'receipt.created', 'receipt', new.id, new.number, jsonb_build_object('payment_id', new.payment_id, 'reservation_id', new.reservation_id));
  return null;
end; $$;

-- Travel file revisions: only the issuance status and revision number; passenger data is never copied.
create or replace function public.audit_travel_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.admin_audit_log (actor, action, entity, entity_id, details)
    values (auth.uid(), 'travel.revised', 'travel', new.reservation_id, jsonb_build_object('revision', new.revision, 'status', new.public_data->>'status'));
  return null;
end; $$;

drop trigger if exists audit_quotation_change on public.quotations;
create trigger audit_quotation_change after insert or update on public.quotations for each row execute function public.audit_quotation_change();
drop trigger if exists audit_reservation_change on public.reservations;
create trigger audit_reservation_change after insert or update on public.reservations for each row execute function public.audit_reservation_change();
drop trigger if exists audit_invoice_change on public.invoices;
create trigger audit_invoice_change after insert or update on public.invoices for each row execute function public.audit_invoice_change();
drop trigger if exists audit_payment_change on public.payments;
create trigger audit_payment_change after insert or update or delete on public.payments for each row execute function public.audit_payment_change();
drop trigger if exists audit_receipt_created on public.payment_receipts;
create trigger audit_receipt_created after insert on public.payment_receipts for each row execute function public.audit_receipt_created();
drop trigger if exists audit_travel_revision on public.reservation_travel_history;
create trigger audit_travel_revision after insert on public.reservation_travel_history for each row execute function public.audit_travel_revision();

-- Trigger functions are not callable through the API.
revoke all on function public.admin_audit_log_immutable(), public.audit_quotation_change(), public.audit_reservation_change(), public.audit_invoice_change(),
  public.audit_payment_change(), public.audit_receipt_created(), public.audit_travel_revision() from public, anon, authenticated;

commit;

-- Verification (read only):
-- select count(*) from pg_trigger where tgname like 'audit_%';                      -- 6
-- select relrowsecurity from pg_class where oid = 'public.admin_audit_log'::regclass; -- true
--
-- Reversal (keeps no business data; drops only what this file created):
-- begin;
-- drop trigger if exists audit_quotation_change on public.quotations; drop trigger if exists audit_reservation_change on public.reservations;
-- drop trigger if exists audit_invoice_change on public.invoices; drop trigger if exists audit_payment_change on public.payments;
-- drop trigger if exists audit_receipt_created on public.payment_receipts; drop trigger if exists audit_travel_revision on public.reservation_travel_history;
-- drop function if exists public.audit_quotation_change(), public.audit_reservation_change(), public.audit_invoice_change(), public.audit_payment_change(),
--   public.audit_receipt_created(), public.audit_travel_revision(), public.log_admin_action(text, text, uuid, text, jsonb);
-- drop table if exists public.admin_audit_log; drop function if exists public.admin_audit_log_immutable();
-- commit;
