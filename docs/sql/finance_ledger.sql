-- Admin overhaul, step 5: money only moves forward.
--   1. Refunds and reversals are new rows in payments, never edits or deletions:
--        'pago'      positive amount (unchanged, record_reservation_payment)
--        'reembolso' negative amount: money returned to the customer (up to what was received)
--        'reverso'   negative amount equal to one payment recorded by mistake; only before it has a receipt
--      Every existing sum of payments.monto (admin balance, invoices, receipts, daily job, Mi viaje "received")
--      therefore nets them out with no code change. Receipts stay for positive payments only.
--   2. Payments can no longer be edited or deleted; invoices and reservations can no longer be deleted
--      (invoices are annulled, reservations cancelled).
--   3. Cancellation is one guided step with a reason: cancel_reservation records why, when and who, and can
--      annul the invoices that were not paid. Paid invoices and payments stay; refunds are recorded apart.
-- reservation_commercial_guard keeps its definition from quotation_integrity.sql (apply that first) plus the
-- cancellation columns (marked "step 5").
-- Rehearsal: node scripts/test-finance-ledger-sql.mjs. Apply only with owner approval, after quotation_integrity.sql.
begin;

alter table public.payments add column if not exists tipo text not null default 'pago';
alter table public.payments add column if not exists revierte_a uuid references public.payments(id);
alter table public.payments add column if not exists motivo text;
alter table public.payments drop constraint if exists payments_tipo_check;
alter table public.payments add constraint payments_tipo_check check (tipo in ('pago', 'reembolso', 'reverso'));
alter table public.payments drop constraint if exists payments_monto_check;
alter table public.payments add constraint payments_monto_check check ((tipo = 'pago' and monto > 0) or (tipo <> 'pago' and monto < 0));
alter table public.payments drop constraint if exists payments_movimiento_check;
alter table public.payments add constraint payments_movimiento_check check (
  (tipo = 'reverso') = (revierte_a is not null)
  and (tipo = 'pago' or char_length(btrim(coalesce(motivo, ''))) between 3 and 500));
create unique index if not exists payments_revierte_a_unique on public.payments (revierte_a) where revierte_a is not null;

alter table public.reservations add column if not exists cancelacion_motivo text;
alter table public.reservations add column if not exists cancelada_en timestamptz;
alter table public.reservations add column if not exists cancelada_por uuid references auth.users(id);
-- NOT VALID: enforced from now on without judging reservations cancelled before the reason existed.
alter table public.reservations drop constraint if exists reservations_cancelacion_motivo;
alter table public.reservations add constraint reservations_cancelacion_motivo
  check (estado <> 'cancelada' or char_length(btrim(coalesce(cancelacion_motivo, ''))) between 3 and 500) not valid;

revoke update, delete, truncate on public.payments from authenticated;
revoke delete, truncate on public.invoices from authenticated;
revoke delete, truncate on public.reservations from authenticated;

-- step 5: refund (money returned) or reversal (a payment recorded by mistake). Idempotent per request id, like
-- record_reservation_payment, so a double click or a retry records it once.
create or replace function public.record_reservation_refund(p_request uuid, p_reservation uuid, p_kind text, p_amount numeric, p_method text, p_date date, p_reference text, p_reason text, p_reverses uuid default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare previous public.payment_recording_requests; r public.reservations; original public.payments; body jsonb; movement uuid; received numeric; amount numeric; method text; day date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  if p_request is null or p_reservation is null or p_kind not in ('reembolso', 'reverso') then raise exception 'Movimiento inválido.' using errcode = '23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request::text, 0));
  body := jsonb_build_object('kind', p_kind, 'amount', p_amount, 'method', p_method, 'date', p_date, 'reference', nullif(p_reference, ''), 'reason', nullif(btrim(p_reason), ''), 'reverses', p_reverses);
  select * into previous from public.payment_recording_requests where request_id = p_request;
  if found then
    if previous.reservation_id <> p_reservation or previous.payload <> body then raise exception 'Este registro ya se usó con otros datos. Recargue el formulario.' using errcode = '23514'; end if;
    return previous.payment_id;
  end if;
  select * into r from public.reservations where id = p_reservation for update;
  if not found then raise exception 'No se encontró la reserva.' using errcode = '23514'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 or length(coalesce(p_reference, '')) > 200 then
    raise exception 'Indique el motivo (y una referencia breve, si la hay).' using errcode = '23514'; end if;
  if p_kind = 'reverso' then
    select * into original from public.payments where id = p_reverses and reservation_id = r.id for update;
    if not found or original.tipo <> 'pago' then raise exception 'Elija un pago de esta reserva.' using errcode = '23514'; end if;
    if exists (select 1 from public.payments where revierte_a = original.id) then raise exception 'Ese pago ya fue revertido.' using errcode = '23514'; end if;
    if exists (select 1 from public.payment_receipts where payment_id = original.id) then
      raise exception 'Ese pago ya tiene recibo: registre un reembolso en lugar de un reverso.' using errcode = '23514'; end if;
    amount := original.monto; method := original.metodo; day := (now() at time zone 'America/Tegucigalpa')::date;
  else
    if p_reverses is not null then raise exception 'Movimiento inválido.' using errcode = '23514'; end if;
    if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) or p_amount > 999999999.99 then raise exception 'Revise el monto.' using errcode = '23514'; end if;
    if p_method is null or p_method not in ('tarjeta', 'transferencia', 'efectivo', 'otro') then raise exception 'Elija cómo se devolvió el dinero.' using errcode = '23514'; end if;
    if p_date is null or p_date > (now() at time zone 'America/Tegucigalpa')::date then raise exception 'Registre una fecha de devolución ya realizada.' using errcode = '23514'; end if;
    select coalesce(sum(monto), 0) into received from public.payments where reservation_id = r.id and moneda = r.moneda;
    if p_amount > received then
      raise exception 'Solo se puede devolver lo recibido: % %.', received, r.moneda using errcode = '23514'; end if;
    amount := p_amount; method := p_method; day := p_date;
  end if;
  insert into public.payments (reservation_id, monto, moneda, metodo, fecha_pago, referencia, notas, tipo, revierte_a, motivo, registrado_por)
    values (r.id, -amount, r.moneda, method, day, nullif(p_reference, ''), null, p_kind, case when p_kind = 'reverso' then original.id end, btrim(p_reason), auth.uid())
    returning id into movement;
  insert into public.payment_recording_requests (request_id, reservation_id, payment_id, payload, created_by)
    values (p_request, p_reservation, movement, body, auth.uid());
  return movement;
end; $function$;

-- step 5: guided cancellation. Records the reason; optionally annuls invoices that were not paid. Repeating it
-- on a cancelled reservation changes nothing.
create or replace function public.cancel_reservation(p_id uuid, p_reason text, p_annul_invoices boolean)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare r public.reservations; annulled integer := 0; received numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict r from public.reservations where id = p_id for update;
  if r.estado = 'cancelada' then return jsonb_build_object('estado', 'cancelada', 'ya_cancelada', true); end if;
  if r.estado = 'completada' then raise exception 'Una reserva completada no se cancela.' using errcode = '23514'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then raise exception 'Indique el motivo de la cancelación.' using errcode = '23514'; end if;
  update public.reservations set estado = 'cancelada', cancelacion_motivo = btrim(p_reason), cancelada_en = now(), cancelada_por = auth.uid() where id = r.id;
  if p_annul_invoices then
    update public.invoices set estado = 'anulada' where reservation_id = r.id and estado in ('borrador', 'emitida');
    get diagnostics annulled = row_count;
  end if;
  select coalesce(sum(monto), 0) into received from public.payments where reservation_id = r.id and moneda = r.moneda;
  return jsonb_build_object('estado', 'cancelada', 'facturas_anuladas', annulled, 'recibido', received, 'moneda', r.moneda);
end; $function$;

CREATE OR REPLACE FUNCTION public.reservation_commercial_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  editable text[] := array['estado','fecha_inicio','fecha_fin','notas','updated_at','comision','segmento','supplier_status','supplier_reference','prerreserva','promoted_at','promoted_by'];
begin
  -- The access surname may be completed once when it was never recorded; it can never be changed afterwards.
  if nullif(btrim(old.cliente_apellido), '') is null and new.cliente_apellido is distinct from old.cliente_apellido then
    if nullif(btrim(new.cliente_apellido), '') is null or length(new.cliente_apellido) > 120 then
      raise exception 'Revise el apellido de acceso del cliente.' using errcode = '23514'; end if;
    editable := array_append(editable, 'cliente_apellido');
  end if;
  -- The access e-mail may be completed once when the reservation was converted without one (WhatsApp-only
  -- customers); like the surname, it can never be changed afterwards, so Mi viaje access cannot be moved.
  if nullif(btrim(old.cliente_email), '') is null and new.cliente_email is distinct from old.cliente_email then
    if coalesce(btrim(new.cliente_email), '') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(new.cliente_email) > 254 then
      raise exception 'Revise el correo de acceso del cliente.' using errcode = '23514'; end if;
    editable := array_append(editable, 'cliente_email');
  end if;
  -- step 3: only an accepted amendment of this reservation's quotation may move it to another version, and only
  -- with exactly that version's snapshot and total, in the same currency.
  if old.accepted_version_id is not null and new.accepted_version_id is distinct from old.accepted_version_id then
    if old.estado in ('cancelada','completada') or new.moneda is distinct from old.moneda
      or new.accepted_snapshot is distinct from (select snapshot from public.quotation_versions where id = new.accepted_version_id and quotation_id = new.quotation_id)
      or new.total is distinct from (new.accepted_snapshot#>>'{quotation,total}')::numeric
      or not exists (select 1 from public.quotations a where a.id = new.quotation_id and a.enmienda_de = old.quotation_id
                       and a.estado = 'aceptada' and a.accepted_version_id = new.accepted_version_id) then
      raise exception 'Solo una enmienda aceptada de esta reserva puede cambiar sus datos comerciales.' using errcode = '23514';
    end if;
    editable := editable || array['quotation_id','accepted_version_id','accepted_snapshot','total','destino'];
  end if;
  -- step 5: the cancellation record is written once, together with the cancellation.
  if old.estado <> 'cancelada' and new.estado = 'cancelada' then
    editable := editable || array['cancelacion_motivo','cancelada_en','cancelada_por'];
  end if;
  if old.accepted_version_id is not null and (to_jsonb(new) - editable) is distinct from (to_jsonb(old) - editable) then
    raise exception 'Los datos comerciales aceptados están bloqueados.' using errcode = '23514'; end if;
  if old.estado in ('cancelada','completada') and new.estado <> old.estado then raise exception 'Estado final.' using errcode = '23514'; end if;
  if new.estado in ('confirmada','en_curso','completada') and (new.prerreserva or new.supplier_status not in ('confirmada','emitida')) then
    raise exception 'Registre la confirmación del proveedor antes de confirmar la reserva.' using errcode = '23514'; end if;
  if new.supplier_status in ('confirmada','emitida') and nullif(btrim(new.supplier_reference),'') is null then
    raise exception 'Se requiere la referencia real del proveedor.' using errcode = '23514'; end if;
  if not old.prerreserva and new.prerreserva then raise exception 'No puede volver a prerreservación.' using errcode = '23514'; end if;
  if old.prerreserva and not new.prerreserva then
    if old.estado <> 'pendiente' then raise exception 'Prerreservación no elegible.' using errcode = '23514'; end if;
    new.promoted_at := now(); new.promoted_by := auth.uid();
  end if;
  return new;
end; $function$;

-- Activity history: the movement type and reason category travel with the payment entry.
CREATE OR REPLACE FUNCTION public.audit_payment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), case new.tipo when 'reembolso' then 'payment.refunded' when 'reverso' then 'payment.reversed' else 'payment.recorded' end, 'payment', new.id,
        jsonb_strip_nulls(jsonb_build_object('reservation_id', new.reservation_id, 'monto', new.monto, 'moneda', new.moneda, 'metodo', new.metodo, 'fecha_pago', new.fecha_pago, 'tipo', new.tipo, 'revierte_a', new.revierte_a)));
  elsif tg_op = 'UPDATE' then
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.edited', 'payment', new.id, jsonb_build_object('reservation_id', new.reservation_id, 'monto', jsonb_build_array(old.monto, new.monto), 'moneda', jsonb_build_array(old.moneda, new.moneda), 'fecha_pago', jsonb_build_array(old.fecha_pago, new.fecha_pago)));
  else
    insert into public.admin_audit_log (actor, action, entity, entity_id, details)
      values (auth.uid(), 'payment.deleted', 'payment', old.id, jsonb_build_object('reservation_id', old.reservation_id, 'monto', old.monto, 'moneda', old.moneda, 'fecha_pago', old.fecha_pago));
  end if;
  return null;
end; $function$;

revoke all on function public.record_reservation_refund(uuid, uuid, text, numeric, text, date, text, text, uuid) from public, anon, service_role;
grant execute on function public.record_reservation_refund(uuid, uuid, text, numeric, text, date, text, text, uuid) to authenticated;
revoke all on function public.cancel_reservation(uuid, text, boolean) from public, anon, service_role;
grant execute on function public.cancel_reservation(uuid, text, boolean) to authenticated;

commit;
