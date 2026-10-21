-- Additive. Requires commercial_recovery.sql. Local/staging review only.
begin;
create table if not exists public.reservation_travel (
 reservation_id uuid primary key references public.reservations(id),
 revision integer not null check(revision>0),
 public_data jsonb not null,
 encrypted_private text not null,
 private_context uuid not null,
 updated_by uuid not null,
 updated_at timestamptz not null default now()
);
create table if not exists public.reservation_travel_history (
 reservation_id uuid references public.reservations(id), revision integer not null,
 public_data jsonb not null, changed_by uuid not null, created_at timestamptz not null default now(),
 primary key(reservation_id,revision)
);
alter table public.reservation_travel enable row level security;
alter table public.reservation_travel_history enable row level security;
drop policy if exists travel_admin_read on public.reservation_travel;
create policy travel_admin_read on public.reservation_travel for select to authenticated using(public.is_admin());
drop policy if exists travel_history_admin_read on public.reservation_travel_history;
create policy travel_history_admin_read on public.reservation_travel_history for select to authenticated using(public.is_admin());
revoke all on public.reservation_travel,public.reservation_travel_history from anon,authenticated;
grant select on public.reservation_travel,public.reservation_travel_history to authenticated;
-- Portal access is server-only after OTP verification, with an explicit public-field SELECT.
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant select on public.reservation_travel,public.reservation_travel_history to service_role;end if;end $$;

create or replace function public.save_reservation_travel(p_id uuid,p_revision integer,p_public jsonb,p_encrypted text,p_context uuid default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.reservations; prior public.reservation_travel; n integer; person jsonb; ticket jsonb; state text;
begin
 if not public.is_admin() then raise exception 'forbidden'; end if;
 select * into r from public.reservations where id=p_id for update;
 if not found or r.estado in ('cancelada','completada') then raise exception 'reservation_not_editable'; end if;
 if p_context is not null and p_context<>p_id and p_context is distinct from r.quotation_id then raise exception 'invalid_encryption_context';end if;
 select * into prior from public.reservation_travel where reservation_id=p_id;
 if coalesce(prior.revision,0)<>p_revision then raise exception 'stale_travel_revision'; end if;
 state:=p_public->>'status';
 if state is null or state not in ('pendiente','en_emision','emitida') or jsonb_typeof(p_public->'passengers') is distinct from 'array' or jsonb_typeof(p_public->'tickets') is distinct from 'array'
 or length(p_encrypted)>200000 or p_encrypted not like 'v1.%' or jsonb_array_length(p_public->'passengers')>30 or jsonb_array_length(p_public->'tickets')>100 then raise exception 'invalid_travel_data'; end if;
 if prior.public_data->>'status'='emitida' and state<>'emitida' then raise exception 'issued_status_locked'; end if;
 if state<>'pendiente' and (r.prerreserva or jsonb_array_length(p_public->'passengers')=0) then raise exception 'passengers_required'; end if;
 if state<>'pendiente' and p_public->>'reviewed' is distinct from 'true' then raise exception 'passenger_review_required';end if;
 if state<>'pendiente' and not coalesce(jsonb_path_exists(r.accepted_snapshot,'$.quotation.detalles.**.segmentos[*]'),false) then raise exception 'no_flight_services';end if;
 if coalesce(p_public->>'confirmedAt','')<>'' and (r.supplier_status not in ('confirmada','emitida') or coalesce(trim(r.supplier_reference),'')='') then raise exception 'supplier_confirmation_required'; end if;
 if state='emitida' then
   if prior.public_data->>'status' is distinct from 'en_emision' and prior.public_data->>'status' is distinct from 'emitida' then raise exception 'start_ticketing_first'; end if;
   if coalesce(p_public->>'confirmedAt','')='' or r.supplier_status not in ('confirmada','emitida') or coalesce(trim(r.supplier_reference),'')='' then raise exception 'supplier_confirmation_required'; end if;
   for person in select * from jsonb_array_elements(p_public->'passengers') loop
     if coalesce(trim(person->>'firstName'),'')='' or coalesce(trim(person->>'lastName'),'')='' or not exists(select 1 from jsonb_array_elements(p_public->'tickets') t where t->>'passengerId'=person->>'id') then raise exception 'ticket_evidence_required'; end if;
   end loop;
   for ticket in select * from jsonb_array_elements(p_public->'tickets') loop
     if coalesce(trim(ticket->>'number'),'')='' or coalesce(trim(ticket->>'pnr'),'')='' or coalesce(trim(ticket->>'airline'),'')='' or coalesce(trim(ticket->>'segments'),'')='' or coalesce(ticket->>'issueDate','')='' then raise exception 'ticket_evidence_required'; end if;
   end loop;
 end if;
 n:=p_revision+1;
 insert into public.reservation_travel(reservation_id,revision,public_data,encrypted_private,private_context,updated_by,updated_at) values(p_id,n,p_public,p_encrypted,coalesce(p_context,p_id),auth.uid(),now()) on conflict(reservation_id) do update set revision=n,public_data=p_public,encrypted_private=p_encrypted,private_context=coalesce(p_context,p_id),updated_by=auth.uid(),updated_at=now();
 insert into public.reservation_travel_history(reservation_id,revision,public_data,changed_by) values(p_id,n,p_public,auth.uid());
 return n;
end $$;
revoke all on function public.save_reservation_travel(uuid,integer,jsonb,text,uuid) from public,anon;
grant execute on function public.save_reservation_travel(uuid,integer,jsonb,text,uuid) to authenticated;
create or replace function public.convert_quotation_with_passengers(p_id uuid,p_version_id uuid,p_prereservation boolean,p_lastname text,p_public jsonb,p_encrypted text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare result uuid;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 if p_public->>'status' is distinct from 'pendiente' then raise exception 'initial_ticketing_pending';end if;
 result:=public.convert_accepted_quotation(p_id,p_version_id,p_prereservation,p_lastname);
 if not exists(select 1 from public.reservation_travel where reservation_id=result) then perform public.save_reservation_travel(result,0,p_public,p_encrypted,p_id);end if;
 return result;
end $$;
revoke all on function public.convert_quotation_with_passengers(uuid,uuid,boolean,text,jsonb,text) from public,anon;
grant execute on function public.convert_quotation_with_passengers(uuid,uuid,boolean,text,jsonb,text) to authenticated;
create or replace function public.purge_reservation_travel_private(p_id uuid,p_revision integer,p_encrypted text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare prior public.reservation_travel;
begin
 if not public.is_admin() then raise exception 'forbidden';end if;
 select * into prior from public.reservation_travel where reservation_id=p_id for update;
 if not found or prior.revision<>p_revision or p_encrypted not like 'v1.%' then raise exception 'stale_travel_revision';end if;
 update public.reservation_travel set encrypted_private=p_encrypted,private_context=p_id,revision=p_revision+1,updated_at=now(),updated_by=auth.uid() where reservation_id=p_id;
 insert into public.reservation_travel_history(reservation_id,revision,public_data,changed_by) values(p_id,p_revision+1,prior.public_data,auth.uid());
end $$;
revoke all on function public.purge_reservation_travel_private(uuid,integer,text) from public,anon;
grant execute on function public.purge_reservation_travel_private(uuid,integer,text) to authenticated;
create or replace function public.guard_supplier_ticketing() returns trigger language plpgsql set search_path=public,pg_temp as $$
begin
 if new.supplier_status='emitida' and not exists(select 1 from public.reservation_travel where reservation_id=new.id and public_data->>'status'='emitida') then raise exception 'ticket_evidence_required';end if;
 return new;
end $$;
drop trigger if exists supplier_ticket_evidence on public.reservations;
create trigger supplier_ticket_evidence before update of supplier_status on public.reservations for each row execute function public.guard_supplier_ticketing();
commit;
