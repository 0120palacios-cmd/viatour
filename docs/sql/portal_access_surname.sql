-- Portal access surname for reservations converted without one. NOT applied. Run only with the owner's
-- approval, after a fresh backup: npx supabase db query --linked --file docs/sql/portal_access_surname.sql
--
-- Why: Mi viaje signs a customer in with reservation code + registered surname + emailed one-time code.
-- The two real reservations (VT-7CC608B0, VT-CCB2E6FD, verified read-only on 2026-10-21) have an empty
-- cliente_apellido and an accepted version, and reservation_commercial_guard blocks any change to it, so
-- those customers cannot sign in at all.
--
-- Change: the guard additionally allows cliente_apellido to be set ONCE, only while it is empty (null or
-- blank), to a non-blank value of at most 120 characters. Every other accepted commercial field stays
-- locked exactly as before. The function body is otherwise identical to docs/sql/commercial_recovery.sql,
-- which also restores its Spanish accents (the production copy shows "estÃ¡n" instead of "están").
--
-- File encoding: UTF-8. After running, the post-check below must find no "Ã" in the function.
-- Rollback: re-run the reservation_commercial_guard definition from docs/sql/commercial_recovery.sql
-- (lines 117-136) with UTF-8 encoding. A surname already filled in stays filled in (harmless).

begin;

create or replace function public.reservation_commercial_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  editable text[] := array['estado','fecha_inicio','fecha_fin','notas','updated_at','comision','segmento','supplier_status','supplier_reference','prerreserva','promoted_at','promoted_by'];
begin
  -- The access surname may be completed once when it was never recorded; it can never be changed afterwards.
  if nullif(btrim(old.cliente_apellido), '') is null and new.cliente_apellido is distinct from old.cliente_apellido then
    if nullif(btrim(new.cliente_apellido), '') is null or length(new.cliente_apellido) > 120 then
      raise exception 'Revise el apellido de acceso del cliente.' using errcode = '23514'; end if;
    editable := array_append(editable, 'cliente_apellido');
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
end; $$;

commit;

-- POST-CHECKS (read only; run separately):
-- begin read only;
-- select pg_get_functiondef('public.reservation_commercial_guard'::regproc) like '%Ã%' as still_garbled,         -- expect false
--        pg_get_functiondef('public.reservation_commercial_guard'::regproc) like '%cliente_apellido%' as has_rule; -- expect true
-- select codigo, nullif(btrim(cliente_apellido),'') is not null as has_surname from public.reservations order by codigo;
-- commit;
-- Then set each surname from /admin/reservas/<id> ("Apellido de acceso a Mi viaje"), with the surname exactly as
-- the customer will type it, and confirm it cannot be edited a second time.
