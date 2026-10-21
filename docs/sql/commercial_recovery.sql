-- LOCAL REVIEW ONLY. Requires quotations_v5.sql and invoices_v5.sql.
-- Apply only after owner approval and commercial_recovery_preflight.sql review.
begin;
alter table public.quotations add column if not exists aceptada_en timestamptz;
alter table public.quotations add column if not exists aceptada_por uuid;
alter table public.quotations add column if not exists aceptacion_notas text;
alter table public.quotations add column if not exists accepted_version_id uuid references public.quotation_versions(id);
alter table public.quotations add column if not exists sent_version_id uuid references public.quotation_versions(id);
alter table public.reservations add column if not exists accepted_version_id uuid references public.quotation_versions(id);
alter table public.reservations add column if not exists accepted_snapshot jsonb;
alter table public.reservations add column if not exists prerreserva boolean not null default false;
alter table public.reservations add column if not exists supplier_status text not null default 'pendiente' check (supplier_status in ('pendiente','parcial','confirmada','emitida'));
alter table public.reservations add column if not exists supplier_reference text;
alter table public.reservations add column if not exists cliente_apellido text;
alter table public.reservations add column if not exists promoted_at timestamptz;
alter table public.reservations add column if not exists promoted_by uuid;
alter table public.reservations add column if not exists comision numeric(12,2) check (comision is null or comision >= 0);
alter table public.reservations add column if not exists segmento text;
alter table public.invoices add column if not exists commercial_snapshot jsonb;
create unique index if not exists invoices_commercial_active_unique on public.invoices(reservation_id) where commercial_snapshot is not null and estado <> 'anulada';

-- An accepted document can no longer be unlocked by changing its status.
create or replace function public.quotations_lock_accepted() returns trigger
language plpgsql set search_path = '' as $$
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
end; $$;

create or replace function public.accept_quotation(p_id uuid, p_version_id uuid, p_notes text)
returns uuid language plpgsql security invoker set search_path = '' as $$
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
end; $$;

create or replace function public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text)
returns uuid language plpgsql security invoker set search_path = '' as $$
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
end; $$;

-- Freeze commercial data on converted records; operational notes/status remain editable.
create or replace function public.reservation_commercial_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.accepted_version_id is not null and (to_jsonb(new) - array['estado','fecha_inicio','fecha_fin','notas','updated_at','comision','segmento','supplier_status','supplier_reference','prerreserva','promoted_at','promoted_by'])
    is distinct from (to_jsonb(old) - array['estado','fecha_inicio','fecha_fin','notas','updated_at','comision','segmento','supplier_status','supplier_reference','prerreserva','promoted_at','promoted_by']) then
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
drop trigger if exists reservation_commercial_guard on public.reservations;
create trigger reservation_commercial_guard before update on public.reservations for each row execute function public.reservation_commercial_guard();

create or replace function public.reservation_items_commercial_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  frozen jsonb;
  target_id uuid;
begin
  if tg_op = 'INSERT' then
    select accepted_snapshot->'items'->new.orden
      into frozen
    from public.reservations
    where id = new.reservation_id
      and accepted_version_id is not null;

    if exists (
      select 1 from public.reservations
      where id = new.reservation_id
        and accepted_version_id is not null
    ) then
      if frozen is null
        or new.descripcion is distinct from frozen->>'descripcion'
        or new.tipo is distinct from frozen->>'tipo'
        or new.cantidad is distinct from (frozen->>'cantidad')::numeric
        or new.precio_unitario is distinct from (frozen->>'precio_unitario')::numeric
        or exists (
          select 1 from public.reservation_items
          where reservation_id = new.reservation_id
            and orden = new.orden
        )
      then
        raise exception 'Los servicios deben coincidir con la versión aceptada.'
          using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    target_id := old.reservation_id;
  else
    target_id := new.reservation_id;
  end if;

  if exists (
    select 1 from public.reservations
    where id = target_id and accepted_version_id is not null
  )
  or (
    tg_op = 'UPDATE'
    and exists (
      select 1 from public.reservations
      where id = old.reservation_id
        and accepted_version_id is not null
    )
  ) then
    raise exception 'Los servicios aceptados están bloqueados.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end; $$;
drop trigger if exists reservation_items_commercial_guard on public.reservation_items;
create trigger reservation_items_commercial_guard before insert or update or delete on public.reservation_items for each row execute function public.reservation_items_commercial_guard();

create or replace function public.create_reservation_invoice(p_id uuid, p_due date)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare r public.reservations; i uuid; lines jsonb; amount numeric;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict r from public.reservations where id = p_id for update;
  select id into i from public.invoices where reservation_id = p_id and estado <> 'anulada' order by created_at limit 1;
  if i is not null then return i; end if;
  if r.estado = 'cancelada' or r.prerreserva or p_due is null or p_due < current_date then raise exception 'Revise la reserva y el vencimiento.' using errcode = '23514'; end if;
  select jsonb_agg(jsonb_build_object('descripcion',descripcion,'tipo',tipo,'cantidad',cantidad,'precio_unitario',precio_unitario,'orden',orden) order by orden),
    sum(case when lower(btrim(tipo))='descuento' then -1 else 1 end * round(cantidad * precio_unitario,2)) into lines,amount from public.reservation_items where reservation_id = p_id;
  if lines is null or amount is distinct from r.total or amount < 0 then raise exception 'Revise los importes de la reserva.' using errcode = '23514'; end if;
  insert into public.invoices(reservation_id,numero,cliente_nombre,cliente_email,cliente_telefono,items,total,moneda,fecha_emision,fecha_vencimiento,estado,notas,commercial_snapshot)
    values (r.id,'FAC-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),r.cliente_nombre,r.cliente_email,r.cliente_telefono,lines,r.total,r.moneda,current_date,p_due,'borrador',null,
      jsonb_build_object('reservation_code',r.codigo,'payment_terms',r.accepted_snapshot#>'{quotation,detalles,pago}')) returning id into i;
  return i;
end; $$;

create or replace function public.invoice_integrity_guard() returns trigger
language plpgsql set search_path = '' as $$
declare paid numeric;
begin
  if tg_op = 'UPDATE' and old.estado <> 'borrador' and (to_jsonb(new)-array['estado','updated_at']) is distinct from (to_jsonb(old)-array['estado','updated_at']) then
    raise exception 'La factura emitida no se puede sobrescribir.' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and old.estado <> 'borrador' and new.estado = 'borrador' then raise exception 'No puede volver a borrador.' using errcode = '23514'; end if;
  if tg_op = 'UPDATE' and old.estado = 'anulada' and new.estado <> 'anulada' then raise exception 'Factura anulada.' using errcode = '23514'; end if;
  if new.estado = 'pagada' then
    select coalesce(sum(monto),0) into paid from public.payments where reservation_id=new.reservation_id and moneda=new.moneda;
    if paid < new.total then raise exception 'Los pagos registrados no cubren el total.' using errcode = '23514'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists invoice_integrity_guard on public.invoices;
create trigger invoice_integrity_guard before insert or update on public.invoices for each row execute function public.invoice_integrity_guard();

create or replace function public.save_reservation_record(p_id uuid,p_values jsonb,p_items jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
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
end; $$;
revoke all on function public.save_reservation_record(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_reservation_record(uuid,jsonb,jsonb) to authenticated;

revoke all on function public.accept_quotation(uuid,uuid,text), public.convert_accepted_quotation(uuid,uuid,boolean,text), public.create_reservation_invoice(uuid,date) from public,anon;
grant execute on function public.accept_quotation(uuid,uuid,text), public.convert_accepted_quotation(uuid,uuid,boolean,text), public.create_reservation_invoice(uuid,date) to authenticated;
commit;
