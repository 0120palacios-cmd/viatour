-- Admin overhaul, step 3: commercial integrity of quotations.
--   1. Rejection reason: a rejected quotation always records why (motivo_rechazo, rechazada_en).
--   2. Amendments that replace: an amendment remembers the quotation it amends (enmienda_de). Accepting it
--      (accept_quotation) marks the original "reemplazada" and, when the original was already converted, moves
--      that reservation to the amended version (total, services, accepted snapshot) in the same transaction.
--      Payments, invoices, passengers and Mi viaje access are not touched. It is refused when the currency
--      or the customer differ, when the reservation is cancelled or completed, or when the customer already
--      paid more than the new total (a refund must be recorded first).
--   3. Atomic copy: create_quotation_copy inserts the copy and its price lines in one transaction.
-- accept_quotation, quotations_lock_accepted, quotation_items_lock_accepted, reservation_commercial_guard and
-- reservation_items_commercial_guard keep their production definitions with the additions marked "step 3".
-- Rehearsal: node scripts/test-quotation-integrity-sql.mjs. Apply only with owner approval.
begin;

alter table public.quotations add column if not exists motivo_rechazo text;
alter table public.quotations add column if not exists rechazada_en timestamptz;
alter table public.quotations add column if not exists enmienda_de uuid references public.quotations(id);
alter table public.quotations add column if not exists reemplazada_por uuid references public.quotations(id);
alter table public.quotations add column if not exists reemplazada_en timestamptz;
create index if not exists quotations_enmienda_de_idx on public.quotations (enmienda_de) where enmienda_de is not null;

alter table public.quotations drop constraint if exists quotations_estado_check;
alter table public.quotations add constraint quotations_estado_check
  check (estado = any (array['borrador','enviada','aceptada','rechazada','expirada','reemplazada']));
-- NOT VALID: enforced on every new write without judging rows rejected before the reason existed.
alter table public.quotations drop constraint if exists quotations_rechazo_motivo;
alter table public.quotations add constraint quotations_rechazo_motivo
  check (estado <> 'rechazada' or char_length(btrim(coalesce(motivo_rechazo, ''))) between 3 and 500) not valid;
alter table public.quotations drop constraint if exists quotations_reemplazo;
alter table public.quotations add constraint quotations_reemplazo
  check ((estado = 'reemplazada') = (reemplazada_por is not null) and (enmienda_de is null or enmienda_de <> id)) not valid;

CREATE OR REPLACE FUNCTION public.quotations_lock_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  -- Adopt a legacy acceptance only against its already recorded version; record review time now.
  if old.estado='aceptada' and old.accepted_version_id is null and old.version_aceptada is not null
    and new.accepted_version_id is not null and new.aceptada_por=auth.uid()
    and exists(select 1 from public.quotation_versions where id=new.accepted_version_id and quotation_id=old.id and version=old.version_aceptada)
    and (to_jsonb(new)-array['updated_at','accepted_version_id','aceptada_en','aceptada_por','aceptacion_notas'])
      is not distinct from (to_jsonb(old)-array['updated_at','accepted_version_id','aceptada_en','aceptada_por','aceptacion_notas']) then return new; end if;
  -- step 3: an accepted quotation is replaced only by its own accepted amendment, and nothing else changes.
  if old.estado = 'aceptada' and new.estado = 'reemplazada'
    and (to_jsonb(new) - array['updated_at','estado','reemplazada_por','reemplazada_en'])
      is not distinct from (to_jsonb(old) - array['updated_at','estado','reemplazada_por','reemplazada_en'])
    and exists (select 1 from public.quotations a where a.id = new.reemplazada_por and a.enmienda_de = old.id and a.estado = 'aceptada') then
    return new;
  end if;
  if old.estado in ('aceptada','reemplazada') and (to_jsonb(new) - array['updated_at','agente_id'])
    is distinct from (to_jsonb(old) - array['updated_at','agente_id']) then
    raise exception 'La cotización aceptada es inmutable. Cree una enmienda.' using errcode = '23514';
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION public.quotation_items_lock_accepted()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if exists (select 1 from public.quotations q where q.id = coalesce(new.quotation_id, old.quotation_id) and q.estado in ('aceptada','reemplazada')) then
    raise exception 'La cotización fue aceptada y sus precios no se pueden modificar. Cree una enmienda.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$function$;

-- step 3: moves an accepted amendment into place. Called by accept_quotation; idempotent.
CREATE OR REPLACE FUNCTION public.apply_quotation_amendment(p_amendment uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare a public.quotations; o public.quotations; v public.quotation_versions; r public.reservations; s jsonb; amount numeric; paid numeric;
  start_date date; end_date date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict a from public.quotations where id = p_amendment;
  if a.enmienda_de is null then return null; end if;
  if a.estado <> 'aceptada' or a.accepted_version_id is null then
    raise exception 'Acepte la enmienda antes de aplicarla.' using errcode = '23514'; end if;
  select * into strict o from public.quotations where id = a.enmienda_de for update;
  if o.estado = 'reemplazada' and o.reemplazada_por = a.id then
    return (select id from public.reservations where quotation_id = a.id);
  end if;
  if o.estado <> 'aceptada' then
    raise exception 'La cotización % ya no está vigente; enmiende la versión vigente.', o.codigo using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = a.accepted_version_id and quotation_id = a.id;
  s := v.snapshot->'quotation';
  amount := (s->>'total')::numeric;
  select * into r from public.reservations where quotation_id = o.id for update;
  if r.id is not null then
    if r.estado in ('cancelada','completada') then
      raise exception 'La reserva % está %: no admite enmiendas.', r.codigo, r.estado using errcode = '23514'; end if;
    if s->>'moneda' is distinct from r.moneda then
      raise exception 'La enmienda debe estar en %, la moneda de la reserva %.', r.moneda, r.codigo using errcode = '23514'; end if;
    if a.customer_id is distinct from r.customer_id then
      raise exception 'La enmienda debe ser del mismo cliente que la reserva %.', r.codigo using errcode = '23514'; end if;
    select coalesce(sum(monto), 0) into paid from public.payments where reservation_id = r.id;
    if paid > amount then
      raise exception 'El cliente ya pagó % %, más que el nuevo total de % %. Registre primero la devolución.', paid, r.moneda, amount, r.moneda using errcode = '23514'; end if;
  end if;

  update public.quotations set estado = 'reemplazada', reemplazada_por = a.id, reemplazada_en = now() where id = o.id;
  if r.id is null then return null; end if;

  start_date := nullif(s#>>'{detalles,fechaSalida}','')::date;
  end_date := nullif(s#>>'{detalles,fechaRegreso}','')::date;
  update public.reservations set quotation_id = a.id, accepted_version_id = v.id, accepted_snapshot = v.snapshot, total = amount,
    destino = s->>'destino', fecha_inicio = coalesce(start_date, r.fecha_inicio), fecha_fin = coalesce(end_date, r.fecha_fin)
    where id = r.id;
  perform set_config('viatour.amending_reservation', r.id::text, true);
  delete from public.reservation_items where reservation_id = r.id;
  perform set_config('viatour.amending_reservation', '', true);
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r.id,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r.id;
end; $function$;

CREATE OR REPLACE FUNCTION public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.quotations; v public.quotation_versions;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict q from public.quotations where id = p_id for update;
  if q.estado = 'aceptada' and q.accepted_version_id = p_version_id then return p_version_id; end if;
  if q.estado='aceptada' and q.accepted_version_id is null and q.version_aceptada is not null then
    select * into strict v from public.quotation_versions where id=p_version_id and quotation_id=p_id and version=q.version_aceptada;
    if length(btrim(coalesce(p_notes,''))) < 5 then raise exception 'Registre la referencia de revisión de la aceptación anterior.' using errcode='23514'; end if;
    update public.quotations set accepted_version_id=v.id,aceptada_en=now(),aceptada_por=auth.uid(),aceptacion_notas='Revisión de aceptación anterior: ' || p_notes where id=p_id;
    return v.id;
  end if;
  if q.estado <> 'enviada' then raise exception 'Solo puede aceptar una cotización enviada.' using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  if (q.sent_version_id is not null and q.sent_version_id is distinct from p_version_id)
    or (q.sent_version_id is null and (length(btrim(coalesce(p_notes,''))) < 5 or v.snapshot->>'origen' = 'aceptacion')) then
    raise exception 'Revise la versión enviada y registre la referencia del envío anterior.' using errcode = '23514';
  end if;
  if coalesce((v.snapshot->'quotation'->>'vence_en')::timestamptz,
      ((v.snapshot->'quotation'->>'validez')::date + time '23:59:59') at time zone 'America/Tegucigalpa') < now() then
    raise exception 'La versión enviada venció. Prepare una nueva cotización.' using errcode = '23514';
  end if;
  if jsonb_array_length(v.snapshot->'items') < 1 or length(coalesce(p_notes,'')) > 2000 then
    raise exception 'Versión o referencia inválida.' using errcode = '23514';
  end if;
  if (v.snapshot#>>'{quotation,total}')::numeric is null or (v.snapshot#>>'{quotation,total}')::numeric < 0
    or (v.snapshot#>>'{quotation,total}')::numeric is distinct from
      (select sum(case when lower(btrim(x->>'tipo'))='descuento' then -1 else 1 end * round((x->>'cantidad')::numeric*(x->>'precio_unitario')::numeric,2)) from jsonb_array_elements(v.snapshot->'items') x)
    or exists(select 1 from jsonb_array_elements(v.snapshot->'items') x where coalesce((x->>'cantidad')::numeric,0)<=0 or coalesce((x->>'precio_unitario')::numeric,-1)<0) then
    raise exception 'Revise los importes de la versión enviada antes de aceptarla.' using errcode='23514';
  end if;
  update public.quotations set estado = 'aceptada', version_aceptada = v.version,
    accepted_version_id = v.id, aceptada_en = now(), aceptada_por = auth.uid(), aceptacion_notas = nullif(btrim(p_notes),'') where id = p_id;
  -- step 3: an accepted amendment replaces its original (and moves its reservation) in this same transaction.
  perform public.apply_quotation_amendment(p_id);
  return v.id;
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

CREATE OR REPLACE FUNCTION public.reservation_items_commercial_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  frozen jsonb;
  target_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT accepted_snapshot->'items'->NEW.orden
      INTO frozen
    FROM public.reservations
    WHERE id = NEW.reservation_id
      AND accepted_version_id IS NOT NULL;

    IF EXISTS (
      SELECT 1
      FROM public.reservations
      WHERE id = NEW.reservation_id
        AND accepted_version_id IS NOT NULL
    ) THEN
      IF frozen IS NULL
         OR NEW.descripcion IS DISTINCT FROM frozen->>'descripcion'
         OR NEW.tipo IS DISTINCT FROM frozen->>'tipo'
         OR NEW.cantidad IS DISTINCT FROM (frozen->>'cantidad')::numeric
         OR NEW.precio_unitario IS DISTINCT FROM (frozen->>'precio_unitario')::numeric
         OR EXISTS (
           SELECT 1
           FROM public.reservation_items
           WHERE reservation_id = NEW.reservation_id
             AND orden = NEW.orden
         )
      THEN
        RAISE EXCEPTION 'Los servicios deben coincidir con la versión aceptada.'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    target_id := OLD.reservation_id;
    -- step 3: apply_quotation_amendment replaces the services of the reservation it is moving, and only those.
    IF current_setting('viatour.amending_reservation', true) = OLD.reservation_id::text
       AND EXISTS (
         SELECT 1
         FROM public.reservations r
         JOIN public.quotations a ON a.id = r.quotation_id
         WHERE r.id = OLD.reservation_id
           AND a.enmienda_de IS NOT NULL
           AND a.accepted_version_id = r.accepted_version_id
       )
    THEN
      RETURN OLD;
    END IF;
  ELSE
    target_id := NEW.reservation_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservations
    WHERE id = target_id
      AND accepted_version_id IS NOT NULL
  )
  OR (
    TG_OP = 'UPDATE'
    AND EXISTS (
      SELECT 1
      FROM public.reservations
      WHERE id = OLD.reservation_id
        AND accepted_version_id IS NOT NULL
    )
  ) THEN
    RAISE EXCEPTION 'Los servicios aceptados están bloqueados.'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$function$;

-- step 3: the copy (or amendment) and its price lines are created together or not at all. The row is prepared by
-- the app (duplicateQuotation resets confirmations and dates); the database decides state, links and total.
CREATE OR REPLACE FUNCTION public.create_quotation_copy(p_source uuid, p_amendment boolean, p_row jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare src public.quotations; open_code text; new_id uuid; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict src from public.quotations where id = p_source;
  if jsonb_typeof(p_row) is distinct from 'object' or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 50 then
    raise exception 'Copia inválida.' using errcode = '23514'; end if;
  if p_amendment then
    if src.estado = 'reemplazada' then
      raise exception 'La cotización % ya fue reemplazada por %. Enmiende la versión vigente.', src.codigo, (select codigo from public.quotations where id = src.reemplazada_por) using errcode = '23514'; end if;
    if src.estado <> 'aceptada' then
      raise exception 'Solo se enmienda una cotización aceptada; esta todavía se puede editar.' using errcode = '23514'; end if;
    select codigo into open_code from public.quotations where enmienda_de = src.id and estado in ('borrador','enviada') limit 1;
    if open_code is not null then
      raise exception 'Ya existe la enmienda % en curso. Ábrala para continuar.', open_code using errcode = '23514'; end if;
  end if;
  insert into public.quotations (codigo, customer_id, cliente_nombre, cliente_email, cliente_telefono, destino, moneda, validez, notas,
      agente_id, estado, tipo, detalles, lead_id, enmienda_de, total)
    values (p_row->>'codigo', nullif(p_row->>'customer_id','')::uuid, p_row->>'cliente_nombre', nullif(p_row->>'cliente_email',''),
      nullif(p_row->>'cliente_telefono',''), p_row->>'destino', coalesce(p_row->>'moneda', src.moneda), nullif(p_row->>'validez','')::date,
      p_row->>'notas', auth.uid(), 'borrador', coalesce(p_row->>'tipo', src.tipo), coalesce(p_row->'detalles', '{}'::jsonb), src.lead_id,
      case when p_amendment then src.id end, 0)
    returning id into new_id;
  insert into public.quotation_items (quotation_id, descripcion, tipo, cantidad, precio_unitario, orden)
    select new_id, x->>'descripcion', x->>'tipo', (x->>'cantidad')::integer, (x->>'precio_unitario')::numeric, (n - 1)::int
    from jsonb_array_elements(p_items) with ordinality as lines(x, n);
  select coalesce(sum(case when lower(btrim(tipo)) = 'descuento' then -1 else 1 end * round(cantidad * precio_unitario, 2)), 0)
    into amount from public.quotation_items where quotation_id = new_id;
  update public.quotations set total = amount where id = new_id;
  return new_id;
end; $function$;

revoke all on function public.apply_quotation_amendment(uuid) from public, anon, service_role;
grant execute on function public.apply_quotation_amendment(uuid) to authenticated;
revoke all on function public.create_quotation_copy(uuid, boolean, jsonb, jsonb) from public, anon, service_role;
grant execute on function public.create_quotation_copy(uuid, boolean, jsonb, jsonb) to authenticated;

commit;
