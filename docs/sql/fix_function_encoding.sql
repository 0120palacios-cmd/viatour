-- Repairs double-encoded accents in 5 production functions (applied earlier with a wrong client encoding).
-- Logic is byte-for-byte the production definition; only the garbled text changes ("versiÃ³n" -> "versión").
-- Generated from the read-only schema snapshot. Rehearsal: node scripts/test-function-encoding-sql.mjs
-- Apply only with owner approval: npx supabase db query --linked --file docs/sql/fix_function_encoding.sql
begin;

-- accept_quotation
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
  return v.id;
end; $function$;

-- convert_accepted_quotation
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
  if btrim(coalesce(p_lastname,'')) = '' or length(p_lastname) > 120 or coalesce(s->>'cliente_email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
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
    values ('RES-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),q.id,q.customer_id,s->>'cliente_nombre',s->>'cliente_email',s->>'cliente_telefono',btrim(p_lastname),s->>'destino',s->>'moneda',amount,'pendiente',start_date,end_date,null,q.agente_id,v.id,v.snapshot,p_prereservation) returning id into r;
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r;
end; $function$;

-- quotations_lock_accepted
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
  if old.estado = 'aceptada' and (to_jsonb(new) - array['updated_at','agente_id'])
    is distinct from (to_jsonb(old) - array['updated_at','agente_id']) then
    raise exception 'La cotización aceptada es inmutable. Cree una enmienda.' using errcode = '23514';
  end if;
  return new;
end; $function$;

-- reservation_commercial_guard
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

-- save_reservation_record
CREATE OR REPLACE FUNCTION public.save_reservation_record(p_id uuid, p_values jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare r public.reservations; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode='42501'; end if;
  select * into strict r from public.reservations where id=p_id for update;
  if r.accepted_version_id is null then
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Revise los servicios.' using errcode='23514'; end if;
    delete from public.reservation_items where reservation_id=p_id;
    insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
      select p_id,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int from jsonb_array_elements(p_items) with ordinality lines(x,n);
    select sum(case when lower(btrim(tipo))='descuento' then -1 else 1 end * round(cantidad*precio_unitario,2)) into amount from public.reservation_items where reservation_id=p_id;
    if amount < 0 then raise exception 'Total inválido.' using errcode='23514'; end if;
    if exists(select 1 from public.invoices where reservation_id=p_id and estado<>'anulada') and amount is distinct from r.total then raise exception 'No cambie los importes de una reserva facturada.' using errcode='23514'; end if;
  else amount:=r.total;
  end if;
  if p_values->>'estado' not in ('pendiente','confirmada','en_curso','completada','cancelada') then raise exception 'Estado inválido.' using errcode='23514'; end if;
  update public.reservations set estado=p_values->>'estado',fecha_inicio=nullif(p_values->>'fecha_inicio','')::date,fecha_fin=nullif(p_values->>'fecha_fin','')::date,
    notas=nullif(p_values->>'notas',''),total=amount,comision=nullif(p_values->>'comision','')::numeric,segmento=nullif(p_values->>'segmento',''),
    supplier_status=coalesce(p_values->>'supplier_status',supplier_status),supplier_reference=nullif(p_values->>'supplier_reference','') where id=p_id;
  return p_id;
end; $function$;

-- Verification: no function body may contain double-encoded text.
do $$ begin if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosrc ~ '[Â-ß][-¿]') then raise exception 'double-encoded text remains'; end if; end $$;
commit;
