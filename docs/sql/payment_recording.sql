-- After commercial_recovery.sql and travel_documents.sql. Never auto-applied.
begin;
create table if not exists public.payment_recording_requests (
 request_id uuid primary key,
 reservation_id uuid not null references public.reservations(id),
 payment_id uuid not null unique references public.payments(id),
 payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.payment_recording_requests enable row level security;
revoke all on public.payment_recording_requests from anon,authenticated;
grant select on public.payment_recording_requests to authenticated;
drop policy if exists payment_recording_admin_read on public.payment_recording_requests;
create policy payment_recording_admin_read on public.payment_recording_requests for select to authenticated using(public.is_admin());
create or replace function public.record_reservation_payment(p_request uuid,p_reservation uuid,p_amount numeric,p_currency text,p_method text,p_date date,p_reference text default null,p_notes text default null)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.payment_recording_requests; r public.reservations; body jsonb; payment uuid;
begin
 if not public.is_admin() then raise exception 'admin_required';end if;
 if p_request is null or p_reservation is null then raise exception 'invalid_request';end if;
 -- Same request serializes even when two connections submit concurrently.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 body:=jsonb_build_object('amount',p_amount,'currency',p_currency,'method',p_method,'date',p_date,'reference',nullif(p_reference,''),'notes',nullif(p_notes,''));
 select * into previous from public.payment_recording_requests where request_id=p_request;
 if found then
  if previous.reservation_id<>p_reservation or previous.payload<>body then raise exception 'payment_request_conflict';end if;
  return previous.payment_id;
 end if;
 select * into r from public.reservations where id=p_reservation for update;
 if not found then raise exception 'reservation_missing';end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount>999999999.99
  or p_currency is distinct from r.moneda or p_method is null or p_method not in ('tarjeta','transferencia','efectivo','otro')
  or p_date is null or p_date>(now() at time zone 'America/Tegucigalpa')::date
  or length(coalesce(p_reference,''))>200 or length(coalesce(p_notes,''))>5000 then raise exception 'invalid_payment';end if;
 insert into public.payments(reservation_id,monto,moneda,metodo,fecha_pago,referencia,notas)
 values(p_reservation,p_amount,p_currency,p_method,p_date,nullif(p_reference,''),nullif(p_notes,'')) returning id into payment;
 insert into public.payment_recording_requests(request_id,reservation_id,payment_id,payload,created_by)
 values(p_request,p_reservation,payment,body,auth.uid());
 return payment;
end $$;
revoke all on function public.record_reservation_payment(uuid,uuid,numeric,text,text,date,text,text) from public,anon;
grant execute on function public.record_reservation_payment(uuid,uuid,numeric,text,text,date,text,text) to authenticated;
commit;
