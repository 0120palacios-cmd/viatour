-- Admin overhaul, phase 1: a WhatsApp-only customer (no e-mail) can be converted into a reservation.
-- Same production definition of convert_accepted_quotation with two changes: the e-mail is validated only
-- when present, and an empty e-mail is stored as NULL. Without an e-mail the traveller cannot sign in to
-- Mi viaje (it needs the e-mail code) until the advisor adds one; the admin shows that warning.
-- Rehearsal: node scripts/test-conversion-without-email-sql.mjs. Apply only with owner approval.
-- reservation_commercial_guard: same production definition plus a write-once access e-mail, following the
-- access-surname rule already in production (docs/sql/portal_access_surname.sql).
begin;
CREATE OR REPLACE FUNCTION public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.quotations; v public.quotation_versions; s jsonb; r uuid; amount numeric; start_date date; end_date date;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict q from public.quotations where id = p_id for update;
  select id into r from public.reservations where quotation_id = p_id;
  if r is not null then return r; end if;
  if q.estado <> 'aceptada' or q.accepted_version_id is distinct from p_version_id then
    raise exception 'Revise la versión aceptada.' using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  s := v.snapshot->'quotation';
  if q.customer_id is null or q.customer_id::text is distinct from s->>'customer_id' then
    raise exception 'La versión aceptada debe estar vinculada al cliente correcto.' using errcode = '23514'; end if;
  if btrim(coalesce(p_lastname,'')) = '' or length(p_lastname) > 120 or (nullif(btrim(coalesce(s->>'cliente_email','')),'') is not null and btrim(s->>'cliente_email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Revise el apellido de acceso y el correo del cliente.' using errcode = '23514'; end if;
  if jsonb_typeof(v.snapshot->'items') is distinct from 'array' or jsonb_array_length(v.snapshot->'items') not between 1 and 50 then
    raise exception 'Faltan servicios.' using errcode = '23514'; end if;
  if exists (select 1 from jsonb_array_elements(v.snapshot->'items') x where
    coalesce(x->>'descripcion','') = '' or coalesce((x->>'cantidad')::numeric,0) <= 0 or coalesce((x->>'precio_unitario')::numeric,-1) < 0) then
    raise exception 'Conceptos inválidos.' using errcode = '23514'; end if;
  select sum(case when lower(btrim(x->>'tipo')) = 'descuento' then -1 else 1 end * round((x->>'cantidad')::numeric * (x->>'precio_unitario')::numeric,2))
    into amount from jsonb_array_elements(v.snapshot->'items') x;
  if amount < 0 or amount is distinct from (s->>'total')::numeric or s->>'moneda' not in ('USD','HNL') then
    raise exception 'El total no coincide con la versión aceptada.' using errcode = '23514'; end if;
  start_date := nullif(s#>>'{detalles,fechaSalida}','')::date;
  end_date := nullif(s#>>'{detalles,fechaRegreso}','')::date;
  if start_date is null or end_date is null then
    select coalesce(start_date,min(d::date)), coalesce(end_date,max(d::date)) into start_date,end_date
    from (select value #>> '{}' as d from unnest(array['salidaFecha','llegadaFecha','checkIn','checkOut','fecha','fechaFin']) field cross join lateral jsonb_path_query(s, ('$.detalles.**.' || field)::jsonpath) value) dates
    where d ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$';
  end if;
  insert into public.reservations(codigo,quotation_id,customer_id,cliente_nombre,cliente_email,cliente_telefono,cliente_apellido,destino,moneda,total,estado,fecha_inicio,fecha_fin,notas,agente_id,accepted_version_id,accepted_snapshot,prerreserva)
    values ('RES-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),q.id,q.customer_id,s->>'cliente_nombre',nullif(btrim(coalesce(s->>'cliente_email','')),''),s->>'cliente_telefono',btrim(p_lastname),s->>'destino',s->>'moneda',amount,'pendiente',start_date,end_date,null,q.agente_id,v.id,v.snapshot,p_prereservation) returning id into r;
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r;
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
commit;

-- Reversal: re-run the previous definitions of convert_accepted_quotation and reservation_commercial_guard
-- from docs/sql/000_baseline_schema.sql.
