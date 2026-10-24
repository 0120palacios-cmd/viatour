-- Owner request (2026-10-23): a quotation only needs the customer's WhatsApp number to be sold and sent; the
-- holder's full name and the customer record are settled when it becomes a reservation.
-- convert_accepted_quotation gains two optional parameters:
--   p_holder_name  the holder's full name for the reservation (defaults to the name in the accepted version)
--   p_customer     the customer chosen or created at conversion, used only when the accepted version had none;
--                  a version that already names its customer still must match it (no silent re-linking)
-- convert_quotation_with_passengers passes them through. Both are dropped and recreated (same names, extra
-- optional parameters) so no ambiguous overload remains; their grants are restored as before.
-- Rehearsal: node scripts/test-conversion-holder-sql.mjs. Apply only with owner approval.
begin;

drop function if exists public.convert_quotation_with_passengers(uuid, uuid, boolean, text, jsonb, text);
drop function if exists public.convert_accepted_quotation(uuid, uuid, boolean, text);

CREATE OR REPLACE FUNCTION public.convert_accepted_quotation(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_holder_name text DEFAULT NULL, p_customer uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare q public.quotations; v public.quotation_versions; s jsonb; r uuid; amount numeric; start_date date; end_date date; holder text; customer uuid;
begin
  if not public.is_admin() then raise exception 'No autorizado.' using errcode = '42501'; end if;
  select * into strict q from public.quotations where id = p_id for update;
  select id into r from public.reservations where quotation_id = p_id;
  if r is not null then return r; end if;
  if q.estado <> 'aceptada' or q.accepted_version_id is distinct from p_version_id then
    raise exception 'Revise la versión aceptada.' using errcode = '23514'; end if;
  select * into strict v from public.quotation_versions where id = p_version_id and quotation_id = p_id;
  s := v.snapshot->'quotation';
  -- The customer: the one in the accepted version when it has one (it must still be the quotation's), otherwise the
  -- one chosen at conversion (quotations sold with only a WhatsApp number).
  if nullif(s->>'customer_id', '') is not null then
    if q.customer_id is null or q.customer_id::text is distinct from s->>'customer_id' or (p_customer is not null and p_customer::text is distinct from s->>'customer_id') then
      raise exception 'La versión aceptada debe estar vinculada al cliente correcto.' using errcode = '23514'; end if;
    customer := q.customer_id;
  else
    if p_customer is null or not exists (select 1 from public.customers where id = p_customer) then
      raise exception 'Indique el titular de la reserva.' using errcode = '23514'; end if;
    customer := p_customer;
  end if;
  holder := btrim(coalesce(nullif(btrim(p_holder_name), ''), s->>'cliente_nombre', ''));
  if char_length(holder) not between 2 and 200 then
    raise exception 'Escriba el nombre completo del titular.' using errcode = '23514'; end if;
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
    values ('RES-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),q.id,customer,holder,nullif(btrim(coalesce(s->>'cliente_email','')),''),s->>'cliente_telefono',btrim(p_lastname),s->>'destino',s->>'moneda',amount,'pendiente',start_date,end_date,null,q.agente_id,v.id,v.snapshot,p_prereservation) returning id into r;
  insert into public.reservation_items(reservation_id,descripcion,tipo,cantidad,precio_unitario,orden)
    select r,x->>'descripcion',x->>'tipo',(x->>'cantidad')::numeric,(x->>'precio_unitario')::numeric,(n-1)::int
    from jsonb_array_elements(v.snapshot->'items') with ordinality as lines(x,n);
  return r;
end; $function$;

CREATE OR REPLACE FUNCTION public.convert_quotation_with_passengers(p_id uuid, p_version_id uuid, p_prereservation boolean, p_lastname text, p_public jsonb, p_encrypted text, p_holder_name text DEFAULT NULL, p_customer uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 if p_public->>'status' is distinct from 'pendiente' then raise exception 'initial_ticketing_pending';end if;
 result:=public.convert_accepted_quotation(p_id,p_version_id,p_prereservation,p_lastname,p_holder_name,p_customer);
 if not exists(select 1 from public.reservation_travel where reservation_id=result) then perform public.save_reservation_travel(result,0,p_public,p_encrypted,p_id);end if;
 return result;
end $function$;

revoke all on function public.convert_accepted_quotation(uuid, uuid, boolean, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.convert_accepted_quotation(uuid, uuid, boolean, text, text, uuid) to authenticated, service_role;
revoke all on function public.convert_quotation_with_passengers(uuid, uuid, boolean, text, jsonb, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.convert_quotation_with_passengers(uuid, uuid, boolean, text, jsonb, text, text, uuid) to authenticated, service_role;

commit;
